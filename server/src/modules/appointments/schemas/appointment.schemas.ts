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
  consultationFee: number; // Phí khám bệnh

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

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'MedicalRecord' })
  medicalRecordId?: MongooseSchema.Types.ObjectId;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// Xóa index cũ nếu có
// Tạo index mới cho các trường cần thiết với partial filter để loại trừ lịch đã hủy
// Điều này cho phép đặt lịch trùng giờ với lịch đã bị hủy
AppointmentSchema.index(
  { doctorId: 1, appointmentDate: 1, startTime: 1 },
  {
    unique: true,
    // Chỉ áp dụng unique cho lịch pending, confirmed, completed, in-progress (không bao gồm cancelled)
    partialFilterExpression: {
      status: { $in: ['pending', 'confirmed', 'completed', 'in-progress'] },
    },
  },
);
// NOTE: ensure the DB does not have a legacy unique index on appointmentTime.
// If a legacy index exists in the database (doctorId_1_appointmentDate_1_appointmentTime_1),
// drop it manually. The schema only uses startTime going forward.
