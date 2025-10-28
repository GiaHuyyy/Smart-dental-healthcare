import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentType {
  APPOINTMENT = 'appointment',
  TREATMENT = 'treatment',
  MEDICINE = 'medicine',
  OTHER = 'other',
}

export enum BillType {
  CONSULTATION_FEE = 'consultation_fee',
  REFUND = 'refund',
  RESERVATION_FEE = 'reservation_fee',
  CANCELLATION_CHARGE = 'cancellation_charge',
}

export enum RefundStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  patientId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  doctorId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, enum: Object.values(PaymentStatus) })
  status: string;

  @Prop({ required: true, enum: Object.values(PaymentType) })
  type: string;

  @Prop({ enum: Object.values(BillType) })
  billType: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' })
  relatedPaymentId: mongoose.Schema.Types.ObjectId;

  @Prop({ enum: Object.values(RefundStatus) })
  refundStatus: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, refPath: 'refModel' })
  refId: mongoose.Schema.Types.ObjectId;

  @Prop({ type: String, enum: ['Appointment', 'MedicalRecord'] })
  refModel: string;

  @Prop()
  paymentDate: Date;

  @Prop()
  paymentMethod: string;

  @Prop()
  transactionId: string;

  @Prop()
  notes: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
