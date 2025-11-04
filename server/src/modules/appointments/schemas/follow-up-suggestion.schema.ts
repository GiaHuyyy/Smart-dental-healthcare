import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { User } from 'src/modules/users/schemas/user.schemas';
import { Appointment } from './appointment.schemas';

export type FollowUpSuggestionDocument = HydratedDocument<FollowUpSuggestion>;

export enum FollowUpSuggestionStatus {
  PENDING = 'pending', // Chờ bệnh nhân xử lý
  SCHEDULED = 'scheduled', // Bệnh nhân đã đặt lịch
  REJECTED = 'rejected', // Bệnh nhân từ chối
}

@Schema({ timestamps: true })
export class FollowUpSuggestion {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  patientId: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  doctorId: User;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Appointment',
    required: true,
  })
  parentAppointmentId: Appointment; // Lịch hẹn gốc (đã hoàn thành)

  @Prop()
  suggestedDate?: Date; // Ngày bác sĩ đề xuất (tùy chọn)

  @Prop()
  suggestedTime?: string; // Giờ bác sĩ đề xuất (tùy chọn)

  @Prop({ required: true })
  notes: string; // Lý do tái khám, hướng dẫn

  @Prop({
    type: String,
    enum: Object.values(FollowUpSuggestionStatus),
    default: FollowUpSuggestionStatus.PENDING,
  })
  status: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Appointment' })
  scheduledAppointmentId?: Appointment; // Lịch hẹn đã đặt (sau khi bệnh nhân xác nhận)

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Voucher' })
  voucherId?: MongooseSchema.Types.ObjectId; // Voucher giảm giá 5%

  @Prop()
  rejectedAt?: Date; // Thời điểm từ chối

  @Prop()
  scheduledAt?: Date; // Thời điểm đặt lịch
}

export const FollowUpSuggestionSchema =
  SchemaFactory.createForClass(FollowUpSuggestion);
