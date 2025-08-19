import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  patientId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  doctorId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, enum: ['pending', 'completed', 'failed', 'refunded'] })
  status: string;

  @Prop({ required: true, enum: ['appointment', 'treatment', 'medicine', 'other'] })
  type: string;

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