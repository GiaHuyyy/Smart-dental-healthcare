/**
 * Script để cập nhật tất cả các bill hoàn tiền với paymentMethod = 'wallet_deduction'
 * Chạy: node scripts/update-refund-payment-method.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/smart_dental_healthcare';

const paymentSchema = new mongoose.Schema(
  {},
  { strict: false, collection: 'payments' },
);
const Payment = mongoose.model('Payment', paymentSchema);

async function updateRefundPaymentMethod() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Tìm tất cả bill hoàn tiền
    const refundBills = await Payment.find({
      billType: 'refund',
      status: 'completed',
    });

    console.log(`\n📊 Found ${refundBills.length} refund bills`);

    if (refundBills.length === 0) {
      console.log('✅ No refund bills to update');
      return;
    }

    // Cập nhật tất cả bill hoàn tiền với paymentMethod = 'wallet_deduction'
    const result = await Payment.updateMany(
      {
        billType: 'refund',
        status: 'completed',
      },
      {
        $set: {
          paymentMethod: 'wallet_deduction',
        },
      },
    );

    console.log(
      `\n✅ Updated ${result.modifiedCount} refund bills with paymentMethod = 'wallet_deduction'`,
    );

    // Hiển thị một vài ví dụ
    const updatedBills = await Payment.find({
      billType: 'refund',
      status: 'completed',
    }).limit(5);

    console.log('\n📄 Sample updated bills:');
    updatedBills.forEach((bill, index) => {
      console.log(`\n${index + 1}. Bill ID: ${bill._id}`);
      console.log(`   Amount: ${bill.amount}`);
      console.log(`   Status: ${bill.status}`);
      console.log(`   BillType: ${bill.billType}`);
      console.log(`   PaymentMethod: ${bill.paymentMethod}`);
      console.log(`   Created: ${bill.createdAt}`);
      console.log(`   Updated: ${bill.updatedAt}`);
    });
  } catch (error) {
    console.error('❌ Error updating refund bills:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
updateRefundPaymentMethod()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
