const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/smart_dental_healthcare';

const PaymentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: { type: Number, required: true },
    status: { type: String, required: true },
    type: { type: String, required: true },
    billType: { type: String },
    relatedPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    refundStatus: { type: String },
    refId: { type: mongoose.Schema.Types.ObjectId, refPath: 'refModel' },
    refModel: { type: String },
    paymentDate: { type: Date },
    paymentMethod: { type: String },
    transactionId: { type: String },
    notes: { type: String },
  },
  { timestamps: true },
);

const Payment = mongoose.model('Payment', PaymentSchema);

async function createFakeBills() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const patientId = '68bf91f29b07d235fc04d8a0';
    // Lấy một doctor ID bất kỳ từ database
    const User = mongoose.model(
      'User',
      new mongoose.Schema({}, { strict: false }),
    );
    const doctor = await User.findOne({ role: 'doctor' });

    if (!doctor) {
      console.log('❌ Không tìm thấy doctor nào trong database');
      process.exit(1);
    }

    const doctorId = doctor._id.toString();
    console.log('👨‍⚕️ Using doctor:', doctorId);

    // Tạo appointment ID fake
    const fakeAppointmentId = new mongoose.Types.ObjectId();

    // 1. Bill hoàn tiền (REFUND)
    const refundBill = new Payment({
      patientId: new mongoose.Types.ObjectId(patientId),
      doctorId: new mongoose.Types.ObjectId(doctorId),
      amount: 200000, // Hoàn 200k
      status: 'completed',
      type: 'appointment',
      billType: 'refund',
      refundStatus: 'completed',
      refId: fakeAppointmentId,
      refModel: 'Appointment',
      paymentDate: new Date(),
      paymentMethod: 'wallet_refund',
      transactionId: `REFUND_${Date.now()}`,
      notes: 'Hoàn tiền do hệ thống tự động hủy lịch hẹn',
    });

    await refundBill.save();
    console.log('✅ Bill hoàn tiền đã được tạo:', refundBill._id);

    // 2. Bill trừ phí giữ chỗ (CANCELLATION_CHARGE)
    const cancellationFeeBill = new Payment({
      patientId: new mongoose.Types.ObjectId(patientId),
      doctorId: new mongoose.Types.ObjectId(doctorId),
      amount: 20000, // Trừ 20k phí giữ chỗ
      status: 'completed',
      type: 'appointment',
      billType: 'cancellation_charge',
      refId: fakeAppointmentId,
      refModel: 'Appointment',
      paymentDate: new Date(),
      paymentMethod: 'wallet_deduction',
      transactionId: `CANCEL_FEE_${Date.now()}`,
      notes: 'Phí hủy lịch hẹn - giữ chỗ cho bác sĩ',
    });

    await cancellationFeeBill.save();
    console.log(
      '✅ Bill trừ phí giữ chỗ đã được tạo:',
      cancellationFeeBill._id,
    );

    console.log('\n📋 Tổng kết:');
    console.log('1. Bill hoàn tiền: +200,000 VND');
    console.log('2. Bill trừ phí: -20,000 VND');
    console.log('   Net cho patient: +180,000 VND');

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createFakeBills();
