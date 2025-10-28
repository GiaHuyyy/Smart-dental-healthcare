const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/smart_dental_healthcare';

async function checkVouchers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const patientId = '68bf91f29b07d235fc04d8a0';

    // Check vouchers collection
    const Voucher = mongoose.model(
      'Voucher',
      new mongoose.Schema({}, { strict: false }),
    );
    const vouchers = await Voucher.find({
      patientId: new mongoose.Types.ObjectId(patientId),
    });

    console.log('\n📋 Vouchers for patient:', patientId);
    console.log('Total vouchers:', vouchers.length);

    if (vouchers.length > 0) {
      console.log('\n✅ Voucher details:');
      vouchers.forEach((v, i) => {
        console.log(`\n${i + 1}. Voucher ID: ${v._id}`);
        console.log(`   Code: ${v.code}`);
        console.log(`   Type: ${v.type}`);
        console.log(
          `   Discount: ${v.value}${v.type === 'percentage' ? '%' : ' VND'}`,
        );
        console.log(`   Valid until: ${v.expiresAt}`);
        console.log(`   Used: ${v.isUsed}`);
        console.log(`   Reason: ${v.reason}`);
      });
    } else {
      console.log('❌ No vouchers found for this patient');
    }

    // Check payments collection for this patient
    const Payment = mongoose.model(
      'Payment',
      new mongoose.Schema({}, { strict: false }),
    );
    const payments = await Payment.find({
      patientId: new mongoose.Types.ObjectId(patientId),
    });

    console.log('\n\n💰 Payments for patient:', patientId);
    console.log('Total payments:', payments.length);

    if (payments.length > 0) {
      console.log('\n📊 Payment summary:');
      payments.forEach((p, i) => {
        console.log(`\n${i + 1}. Payment ID: ${p._id}`);
        console.log(`   Amount: ${p.amount} VND`);
        console.log(`   Type: ${p.type}`);
        console.log(`   Bill Type: ${p.billType || 'N/A'}`);
        console.log(`   Status: ${p.status}`);
        console.log(`   Created: ${p.createdAt}`);
        console.log(`   Notes: ${p.notes || 'N/A'}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkVouchers();
