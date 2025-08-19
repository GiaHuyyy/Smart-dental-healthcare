import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { User } from 'src/modules/users/schemas/user.schemas';

export type AppointmentDocument = HydratedDocument<Appointment>;

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  IN_PROGRESS = 'in-progress',
}

@Schema({ timestamps: true })
export class Appointment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  patientId: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  doctorId: User;

  @Prop({ required: true })
  appointmentDate: Date;

  @Prop({ required: true })
  startTime: string;

  @Prop({ required: true })
  endTime: string;

  @Prop({ required: true })
  duration: number; // in minutes

  @Prop({ required: true })
  appointmentType: string; // e.g., 'Khám định kỳ', 'Nhổ răng', 'Tẩy trắng răng'

  @Prop()
  notes: string;

  @Prop({ default: AppointmentStatus.PENDING })
  status: string;

  @Prop()
  cancellationReason: string;

  @Prop({ default: false })
  isRescheduled: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Appointment' })
  previousAppointmentId: Appointment;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// Xóa index cũ nếu có
AppointmentSchema.index({ doctorId: 1, appointmentDate: 1, appointmentTime: 1 }, { unique: false });

// Tạo index mới cho các trường cần thiết
AppointmentSchema.index({ doctorId: 1, appointmentDate: 1, startTime: 1 }, { unique: true });