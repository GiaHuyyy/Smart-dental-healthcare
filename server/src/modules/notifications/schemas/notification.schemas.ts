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

  @Prop({
    required: true,
    enum: [
      'appointment',
      'medical-record',
      'payment',
      'system',
      'APPOINTMENT_NEW',
      'APPOINTMENT_CONFIRMED',
      'APPOINTMENT_CANCELLED',
      'APPOINTMENT_RESCHEDULED',
      'APPOINTMENT_COMPLETED',
      'APPOINTMENT_REMINDER',
      'FOLLOW_UP_SUGGESTION',
      'FOLLOW_UP_REJECTED',
      'PRESCRIPTION_NEW',
      'MEDICAL_RECORD_NEW',
      'PAYMENT_SUCCESS',
      'CHAT_NEW',
      'SYSTEM',
    ],
  })
  type: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, refPath: 'refModel' })
  refId: mongoose.Schema.Types.ObjectId;

  @Prop({ type: String, enum: ['Appointment', 'MedicalRecord', 'Payment'] })
  refModel: string;

  @Prop({ type: Object })
  data?: any;

  @Prop()
  linkTo?: string;

  @Prop()
  icon?: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes for better query performance
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });
