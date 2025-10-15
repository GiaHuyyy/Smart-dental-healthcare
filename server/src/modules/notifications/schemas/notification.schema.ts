import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({
    required: true,
    enum: [
      'APPOINTMENT_NEW',
      'APPOINTMENT_CONFIRMED',
      'APPOINTMENT_CANCELLED',
      'APPOINTMENT_RESCHEDULED',
      'APPOINTMENT_COMPLETED',
      'APPOINTMENT_REMINDER',
      'PRESCRIPTION_NEW',
      'MEDICAL_RECORD_NEW',
      'PAYMENT_SUCCESS',
      'CHAT_NEW',
      'SYSTEM',
    ],
  })
  type: string;

  @Prop({ type: Object })
  data?: any; // Extra data (appointmentId, prescriptionId, etc.)

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  linkTo?: string; // URL to navigate when clicked

  @Prop()
  icon?: string; // Icon type for UI
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes for better query performance
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });
