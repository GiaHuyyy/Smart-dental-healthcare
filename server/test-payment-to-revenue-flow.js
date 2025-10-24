/**
 * Test script để kiểm tra flow Payment → Revenue
 * Chạy: node test-payment-to-revenue-flow.js
 */

const mongoose = require('mongoose');
const axios = require('axios');

// MongoDB connection
const MONGO_URI = 'mongodb://localhost:27017/smart-dental-healthcare';
const API_URL = 'http://localhost:3001';

// Test data - sẽ được lấy từ database
let TEST_DOCTOR_ID = '68a458265aa48c4996d6bf1b'; // Default, will be fetched
let TEST_PATIENT_ID = null; // Will be created if not exists

async function setupDatabase() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB\n');
  
  // Get real doctor ID
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
  const doctor = await User.findOne({ role: 'doctor' }).lean();
  
  if (doctor) {
    TEST_DOCTOR_ID = doctor._id.toString();
    console.log(`👨‍⚕️ Using doctor: ${TEST_DOCTOR_ID} - ${doctor.fullName || doctor.name}\n`);
  } else {
    throw new Error('No doctor found in database!');
  }
  
  // Check if patient exists, create if not
  let patient = await User.findOne({ role: 'patient' }).lean();
  
  if (!patient) {
    console.log('👤 No patient found, creating test patient...');
    patient = await User.create({
      email: 'testpatient@example.com',
      password: 'hashed_password_here',
      fullName: 'Test Patient',
      phoneNumber: '0123456789',
      role: 'patient',
      isActive: true
    });
    console.log(`✅ Created patient: ${patient._id}\n`);
  } else {
    console.log(`👤 Using patient: ${patient._id} - ${patient.fullName || patient.name}\n`);
  }
  
  TEST_PATIENT_ID = patient._id.toString();
}

async function checkExistingData() {
  console.log('📊 Checking existing data...');
  
  const Appointment = mongoose.model('Appointment', new mongoose.Schema({}, { strict: false, collection: 'appointments' }));
  const Payment = mongoose.model('Payment', new mongoose.Schema({}, { strict: false, collection: 'payments' }));
  const Revenue = mongoose.model('Revenue', new mongoose.Schema({}, { strict: false, collection: 'revenues' }));
  
  const appointmentCount = await Appointment.countDocuments();
  const paymentCount = await Payment.countDocuments();
  const revenueCount = await Revenue.countDocuments();
  
  console.log(`  Appointments: ${appointmentCount}`);
  console.log(`  Payments: ${paymentCount}`);
  console.log(`  Revenues: ${revenueCount}\n`);
  
  return { appointmentCount, paymentCount, revenueCount };
}

async function createTestAppointment() {
  console.log('📅 Creating test appointment...');
  
  try {
    const response = await axios.post(`${API_URL}/appointments`, {
      patientId: TEST_PATIENT_ID,
      doctorId: TEST_DOCTOR_ID,
      appointmentTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      reason: 'Test appointment for payment flow',
      status: 'scheduled'
    });
    
    console.log(`✅ Created appointment: ${response.data._id}\n`);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to create appointment:', error.response?.data || error.message);
    return null;
  }
}

async function createTestPayment(appointmentId) {
  console.log('💳 Creating test payment...');
  
  try {
    const response = await axios.post(`${API_URL}/payments`, {
      appointmentId: appointmentId,
      patientId: TEST_PATIENT_ID,
      doctorId: TEST_DOCTOR_ID,
      amount: 500000, // 500k VND
      paymentMethod: 'momo',
      type: 'appointment'
    });
    
    console.log(`✅ Created payment: ${response.data.payment._id}`);
    console.log(`   MoMo Payment URL: ${response.data.paymentUrl}\n`);
    return response.data.payment;
  } catch (error) {
    console.error('❌ Failed to create payment:', error.response?.data || error.message);
    return null;
  }
}

async function simulateMomoCallback(paymentId) {
  console.log('🔔 Simulating MoMo callback (payment success)...');
  
  try {
    // MoMo callback format
    const callbackData = {
      orderId: `ORDER_${paymentId}`,
      requestId: `REQ_${Date.now()}`,
      amount: 500000,
      orderInfo: `Payment for appointment`,
      orderType: 'momo_wallet',
      transId: Math.floor(Math.random() * 1000000000),
      resultCode: 0, // 0 = success
      message: 'Successful.',
      payType: 'qr',
      responseTime: Date.now(),
      extraData: '',
      signature: 'test_signature'
    };
    
    const response = await axios.post(`${API_URL}/payments/momo/callback`, callbackData);
    
    console.log(`✅ MoMo callback processed`);
    console.log(`   Result: ${JSON.stringify(response.data, null, 2)}\n`);
    return true;
  } catch (error) {
    console.error('❌ MoMo callback failed:', error.response?.data || error.message);
    return false;
  }
}

async function checkRevenueCreated(doctorId) {
  console.log('💰 Checking if revenue was created...');
  
  try {
    const response = await axios.get(`${API_URL}/revenue/doctor/${doctorId}/summary`);
    
    console.log(`✅ Revenue summary for doctor:`);
    console.log(`   Total Revenue: ${response.data.totalRevenue} VND`);
    console.log(`   Completed: ${response.data.completed} VND`);
    console.log(`   Pending: ${response.data.pending} VND`);
    console.log(`   Transaction Count: ${response.data.transactionCount}\n`);
    
    // Get detailed revenues
    const detailResponse = await axios.get(`${API_URL}/revenue/doctor/${doctorId}/revenues?page=1&limit=10`);
    console.log(`📋 Revenue transactions: ${detailResponse.data.total}`);
    
    if (detailResponse.data.revenues && detailResponse.data.revenues.length > 0) {
      console.log('\nLatest revenue:');
      const latest = detailResponse.data.revenues[0];
      console.log(`   ID: ${latest._id}`);
      console.log(`   Amount: ${latest.amount} VND`);
      console.log(`   Net Amount: ${latest.netAmount} VND`);
      console.log(`   Platform Fee: ${latest.platformFee} VND`);
      console.log(`   Status: ${latest.status}`);
      console.log(`   Type: ${latest.type}`);
      console.log(`   Date: ${latest.revenueDate}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to get revenue:', error.response?.data || error.message);
    return false;
  }
}

async function runTest() {
  console.log('🧪 TESTING PAYMENT → REVENUE FLOW\n');
  console.log('='.repeat(50) + '\n');
  
  try {
    // Step 1: Setup
    await setupDatabase();
    
    // Step 2: Check existing data
    const initialData = await checkExistingData();
    
    // Step 3: Create test appointment
    const appointment = await createTestAppointment();
    if (!appointment) {
      console.log('❌ Cannot proceed without appointment');
      return;
    }
    
    // Step 4: Create payment
    const payment = await createTestPayment(appointment._id);
    if (!payment) {
      console.log('❌ Cannot proceed without payment');
      return;
    }
    
    // Step 5: Simulate MoMo callback
    const callbackSuccess = await simulateMomoCallback(payment._id);
    if (!callbackSuccess) {
      console.log('❌ MoMo callback failed');
      return;
    }
    
    // Wait a bit for async operations
    console.log('⏳ Waiting 2 seconds for async operations...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 6: Check revenue
    const revenueCreated = await checkRevenueCreated(TEST_DOCTOR_ID);
    
    // Step 7: Final check
    console.log('\n' + '='.repeat(50));
    console.log('📊 FINAL DATABASE STATE:\n');
    await checkExistingData();
    
    if (revenueCreated) {
      console.log('✅ TEST PASSED: Revenue successfully created from payment!\n');
    } else {
      console.log('❌ TEST FAILED: Revenue was NOT created\n');
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
runTest().catch(console.error);
