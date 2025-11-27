import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { User } from 'src/modules/users/schemas/user.schemas';

export type DoctorScheduleDocument = HydratedDocument<DoctorSchedule>;

// Time slot schema for embedded document
@Schema({ _id: false })
export class TimeSlotConfig {
  @Prop({ required: true })
  time: string; // e.g., "08:00", "08:30"

  @Prop({ default: true })
  isWorking: boolean;
}

export const TimeSlotConfigSchema =
  SchemaFactory.createForClass(TimeSlotConfig);

// Day schedule schema for embedded document
@Schema({ _id: false })
export class DayScheduleConfig {
  @Prop({ required: true })
  dayKey: string; // e.g., "monday", "tuesday"

  @Prop({ required: true })
  dayName: string; // e.g., "Thứ 2", "Thứ 3"

  @Prop({ required: true })
  dayIndex: number; // 0 = Sunday, 1 = Monday, ...

  @Prop({ default: true })
  isWorking: boolean;

  @Prop({ type: [TimeSlotConfigSchema], default: [] })
  timeSlots: TimeSlotConfig[];
}

export const DayScheduleConfigSchema =
  SchemaFactory.createForClass(DayScheduleConfig);

// Blocked time schema for embedded document
@Schema({ _id: false })
export class BlockedTimeConfig {
  @Prop({ required: true })
  id: string; // unique identifier

  @Prop({ required: true })
  startDate: string; // YYYY-MM-DD

  @Prop({ required: true })
  endDate: string; // YYYY-MM-DD

  @Prop({ required: true, enum: ['full_day', 'time_range'] })
  type: string;

  @Prop()
  startTime?: string; // HH:mm (only for time_range)

  @Prop()
  endTime?: string; // HH:mm (only for time_range)

  @Prop()
  reason?: string;
}

export const BlockedTimeConfigSchema =
  SchemaFactory.createForClass(BlockedTimeConfig);

// Main Doctor Schedule Schema
@Schema({ timestamps: true })
export class DoctorSchedule {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  doctorId: User;

  @Prop({ type: [DayScheduleConfigSchema], default: [] })
  weeklySchedule: DayScheduleConfig[];

  @Prop({ type: [BlockedTimeConfigSchema], default: [] })
  blockedTimes: BlockedTimeConfig[];
}

export const DoctorScheduleSchema =
  SchemaFactory.createForClass(DoctorSchedule);
