/**
 * Script để tạo revenue records cho các payments đã completed nhưng chưa có revenue
 * Chạy: node scripts/backfill-revenue.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dental-healthcare';

// Payment schema
const paymentSchema = new mongoose.Schema({}, { strict: false });
const Payment = mongoose.model('Payment', paymentSchema);

// Revenue schema
const revenueSchema = new mongoose.Schema({}, { strict: false });
const Revenue = mongoose.model('Revenue', revenueSchema);

async function backfillRevenue() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Tìm tất cả payments đã completed
    console.log('\n🔍 Finding completed payments...');
    const completedPayments = await Payment.find({ status: 'completed' }).populate('doctorId patientId');
    console.log(`   Found ${completedPayments.length} completed payments`);

    let created = 0;
    let alreadyExists = 0;
    let errors = 0;

    console.log('\n💰 Processing payments...\n');

    for (const payment of completedPayments) {
      try {
        // Kiểm tra xem đã có revenue chưa
        const existingRevenue = await Revenue.findOne({ paymentId: payment._id });

        if (existingRevenue) {
          alreadyExists++;
          console.log(`⏭️  Payment ${payment._id} already has revenue - skipping`);
          continue;
        }

        // Tính phí
        const platformFeeRate = 0.05; // 5%
        const platformFee = Math.round(payment.amount * platformFeeRate);
        const netAmount = payment.amount - platformFee;

        // Tạo revenue record
        const revenue = await Revenue.create({
          doctorId: payment.doctorId,
          paymentId: payment._id,
          patientId: payment.patientId,
          amount: payment.amount,
          platformFee,
          netAmount,
          revenueDate: payment.paymentDate || payment.createdAt || new Date(),
          status: 'completed',
          refId: payment.refId,
          refModel: payment.refModel,
          type: payment.type || 'appointment',
          notes: `[Backfill] Doanh thu từ thanh toán #${payment._id}`,
        });

        created++;
        console.log(`✅ Created revenue for payment ${payment._id} - Amount: ${payment.amount} VND, Net: ${netAmount} VND`);
      } catch (error) {
        errors++;
        console.error(`❌ Error processing payment ${payment._id}:`, error.message);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Already exists: ${alreadyExists}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📝 Total processed: ${completedPayments.length}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the script
backfillRevenue();
