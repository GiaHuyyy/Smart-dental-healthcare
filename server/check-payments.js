const mongoose = require('mongoose');

async function checkPayments() {
  try {
    await mongoose.connect('mongodb://localhost:27017/smart_dental_healthcare');
    console.log('✅ Connected to MongoDB');

    // Find completed consultation fee payments
    const payments = await mongoose.connection.db
      .collection('payments')
      .find({
        refModel: 'Appointment',
        billType: 'consultation_fee',
        status: 'completed',
      })
      .limit(10)
      .toArray();

    console.log(
      `\n📊 Found ${payments.length} completed consultation fee payments:`,
    );

    if (payments.length > 0) {
      payments.forEach((p, i) => {
        console.log(`\n${i + 1}. Payment ID: ${p._id}`);
        console.log(`   Appointment: ${p.refId}`);
        console.log(`   Amount: ${p.amount} VND`);
        console.log(`   Payer: ${p.payerId}`);
        console.log(`   Receiver: ${p.receiverId}`);
        console.log(`   Status: ${p.status}`);
        console.log(`   Created: ${p.createdAt}`);
      });

      // Check for refund bills
      console.log('\n🔍 Checking for refund bills...');
      const refunds = await mongoose.connection.db
        .collection('payments')
        .find({
          billType: 'refund',
        })
        .toArray();

      console.log(`\n💰 Found ${refunds.length} refund bills:`);
      if (refunds.length > 0) {
        refunds.forEach((r, i) => {
          console.log(`\n${i + 1}. Refund ID: ${r._id}`);
          console.log(`   Original Payment: ${r.originalPaymentId}`);
          console.log(`   Amount: ${r.amount} VND`);
          console.log(`   Payer: ${r.payerId}`);
          console.log(`   Receiver: ${r.receiverId}`);
          console.log(`   Status: ${r.status}`);
          console.log(`   Created: ${r.createdAt}`);
        });
      } else {
        console.log('   ❌ No refund bills found!');
      }
    } else {
      console.log('   No completed payments found');
    }

    // Check cancelled appointments
    console.log('\n🚫 Checking cancelled appointments...');
    const cancelled = await mongoose.connection.db
      .collection('appointments')
      .find({
        status: 'cancelled',
        cancelledBy: 'system',
      })
      .limit(5)
      .toArray();

    console.log(
      `\n📋 Found ${cancelled.length} system-cancelled appointments:`,
    );
    if (cancelled.length > 0) {
      cancelled.forEach((a, i) => {
        console.log(`\n${i + 1}. Appointment ID: ${a._id}`);
        console.log(`   Patient: ${a.patientId}`);
        console.log(`   Doctor: ${a.doctorId}`);
        console.log(`   Date: ${a.appointmentDate}`);
        console.log(`   Time: ${a.startTime}`);
        console.log(`   Cancelled At: ${a.cancelledAt}`);
        console.log(`   Reason: ${a.cancelReason}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkPayments();
