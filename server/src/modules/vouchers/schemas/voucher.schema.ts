import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type VoucherDocument = HydratedDocument<Voucher>;

export enum VoucherType {
  PERCENTAGE_DISCOUNT = 'percentage',
  FIXED_AMOUNT = 'fixed',
}

export enum VoucherReason {
  DOCTOR_CANCELLATION = 'doctor_cancellation',
  FOLLOW_UP_DISCOUNT = 'follow_up',
}

@Schema({ timestamps: true })
export class Voucher {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  patientId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ type: String, enum: Object.values(VoucherType), required: true })
  type: string;

  @Prop({ required: true })
  value: number;

  @Prop({ type: String, enum: Object.values(VoucherReason) })
  reason: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop({ type: Date })
  usedAt: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' })
  relatedAppointmentId: mongoose.Schema.Types.ObjectId;
}

export const VoucherSchema = SchemaFactory.createForClass(Voucher);
