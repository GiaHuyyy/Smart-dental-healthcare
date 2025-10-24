import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type RevenueDocument = HydratedDocument<Revenue>;

/**
 * Schema lưu trữ doanh thu của bác sĩ
 * Mỗi khi có payment completed, sẽ tạo/cập nhật revenue record
 */
@Schema({ timestamps: true })
export class Revenue {
  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  doctorId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'Payment' })
  paymentId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  patientId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true })
  amount: number; // Số tiền bác sĩ nhận được

  @Prop({ required: true })
  platformFee: number; // Phí nền tảng (nếu có)

  @Prop({ required: true })
  netAmount: number; // Số tiền thực nhận = amount - platformFee

  @Prop({ required: true })
  revenueDate: Date; // Ngày phát sinh doanh thu

  @Prop({ required: true, enum: ['pending', 'completed', 'withdrawn', 'cancelled'] })
  status: string; // Trạng thái: pending (chờ xử lý), completed (hoàn thành), withdrawn (đã rút), cancelled (hủy)

  @Prop({ type: mongoose.Schema.Types.ObjectId, refPath: 'refModel' })
  refId: mongoose.Schema.Types.ObjectId; // Reference đến Appointment hoặc MedicalRecord

  @Prop({ type: String, enum: ['Appointment', 'MedicalRecord', 'Treatment'] })
  refModel: string;

  @Prop({ enum: ['appointment', 'treatment', 'medicine', 'other'] })
  type: string; // Loại doanh thu

  @Prop()
  notes: string;

  @Prop({ type: Date })
  withdrawnDate: Date; // Ngày rút tiền (nếu có)

  @Prop()
  withdrawnMethod: string; // Phương thức rút tiền

  @Prop()
  withdrawnTransactionId: string; // Mã giao dịch rút tiền
}

export const RevenueSchema = SchemaFactory.createForClass(Revenue);

// Index để query nhanh theo bác sĩ và thời gian
RevenueSchema.index({ doctorId: 1, revenueDate: -1 });
RevenueSchema.index({ doctorId: 1, status: 1 });
