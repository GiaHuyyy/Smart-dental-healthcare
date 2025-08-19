import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  userId: mongoose.Schema.Types.ObjectId;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ required: true, enum: ['appointment', 'medical-record', 'payment', 'system'] })
  type: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, refPath: 'refModel' })
  refId: mongoose.Schema.Types.ObjectId;

  @Prop({ type: String, enum: ['Appointment', 'MedicalRecord', 'Payment'] })
  refModel: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);