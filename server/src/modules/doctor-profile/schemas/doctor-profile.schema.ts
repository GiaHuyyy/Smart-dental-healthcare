import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DoctorProfileDocument = HydratedDocument<DoctorProfile>;

// Working hours item schema
@Schema({ _id: false })
export class WorkingHourItem {
  @Prop({ required: true })
  day: string; // e.g., "Thứ 2 - Thứ 6", "Thứ 7", "Chủ nhật"

  @Prop({ required: true })
  time: string; // e.g., "08:00 - 17:00", "08:00 - 12:00", "Nghỉ"
}

export const WorkingHourItemSchema =
  SchemaFactory.createForClass(WorkingHourItem);

// Clinic image schema
@Schema({ _id: false })
export class ClinicImage {
  @Prop({ required: true })
  url: string; // Cloudinary URL

  @Prop()
  caption: string; // Optional caption for the image

  @Prop({ default: 0 })
  order: number; // Display order
}

export const ClinicImageSchema = SchemaFactory.createForClass(ClinicImage);

@Schema({ timestamps: true })
export class DoctorProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  doctorId: Types.ObjectId;

  // Introduction/Bio about the doctor
  @Prop()
  bio: string;

  // Working hours
  @Prop({ type: [WorkingHourItemSchema], default: [] })
  workingHours: WorkingHourItem[];

  // Clinic information
  @Prop()
  clinicName: string;

  @Prop()
  clinicDescription: string;

  // Clinic gallery images
  @Prop({ type: [ClinicImageSchema], default: [] })
  clinicImages: ClinicImage[];
}

export const DoctorProfileSchema = SchemaFactory.createForClass(DoctorProfile);
