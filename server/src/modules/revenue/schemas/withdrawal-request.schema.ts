import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type WithdrawalRequestDocument = WithdrawalRequest & Document;

@Schema({ timestamps: true })
export class WithdrawalRequest {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  doctorId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  amount: number; // Số tiền yêu cầu rút

  @Prop({
    required: true,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending',
  })
  status: string; // pending: chờ duyệt, approved: đã duyệt, rejected: từ chối, completed: đã chuyển tiền

  @Prop({ required: true, enum: ['momo', 'bank_transfer'] })
  withdrawMethod: string; // Phương thức rút tiền

  // Thông tin MoMo
  @Prop()
  momoPhone: string; // Số điện thoại MoMo

  @Prop()
  momoName: string; // Tên tài khoản MoMo

  // Thông tin ngân hàng (để mở rộng sau)
  @Prop()
  bankName: string;

  @Prop()
  bankAccountNumber: string;

  @Prop()
  bankAccountName: string;

  // Thông tin xử lý
  @Prop()
  processedAt: Date; // Ngày xử lý

  @Prop()
  processedBy: MongooseSchema.Types.ObjectId; // Admin xử lý

  @Prop()
  transactionId: string; // Mã giao dịch chuyển tiền

  @Prop()
  rejectionReason: string; // Lý do từ chối (nếu có)

  @Prop()
  notes: string; // Ghi chú

  // Danh sách revenue IDs được rút
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Revenue' }] })
  revenueIds: MongooseSchema.Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

export const WithdrawalRequestSchema =
  SchemaFactory.createForClass(WithdrawalRequest);

// Index để query nhanh
WithdrawalRequestSchema.index({ doctorId: 1, status: 1 });
WithdrawalRequestSchema.index({ createdAt: -1 });
