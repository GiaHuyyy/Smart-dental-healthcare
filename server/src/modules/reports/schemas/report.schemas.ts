import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type ReportDocument = HydratedDocument<Report>;

@Schema({ timestamps: true })
export class Report {
  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  userId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: 'pending', enum: ['pending', 'in_progress', 'resolved', 'rejected'] })
  status: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  assignedTo: mongoose.Schema.Types.ObjectId;

  @Prop({ type: String })
  resolution: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, refPath: 'refModel' })
  refId: mongoose.Schema.Types.ObjectId;

  @Prop({ type: String, enum: ['Appointment', 'MedicalRecord', 'Payment'] })
  refModel: string;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
  participants: mongoose.Schema.Types.ObjectId[];

  @Prop({ type: Date })
  resolvedAt: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);