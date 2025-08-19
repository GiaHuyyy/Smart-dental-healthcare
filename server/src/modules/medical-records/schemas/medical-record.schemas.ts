import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/modules/users/schemas/user.schemas';

export type MedicalRecordDocument = HydratedDocument<MedicalRecord>;

@Schema({ timestamps: true })
export class MedicalRecord {
  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: User.name })
  patientId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: User.name })
  doctorId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true })
  recordDate: Date;

  @Prop({ required: true })
  chiefComplaint: string;

  @Prop({ type: Object })
  vitalSigns: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
  };

  @Prop()
  diagnosis: string;

  @Prop()
  treatmentPlan: string;

  @Prop({ type: [String] })
  medications: string[];

  @Prop()
  notes: string;

  @Prop({ type: [String] })
  attachments: string[];

  @Prop({ type: [{ type: Object }] })
  dentalChart: {
    toothNumber: number;
    condition: string;
    treatment: string;
    notes: string;
  }[];

  @Prop({ type: [{ type: Object }] })
  procedures: {
    name: string;
    description: string;
    date: Date;
    cost: number;
    status: string;
  }[];

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' })
  appointmentId: mongoose.Schema.Types.ObjectId;

  @Prop({ default: false })
  isFollowUpRequired: boolean;

  @Prop()
  followUpDate: Date;

  @Prop({ default: 'active' })
  status: string;
}

export const MedicalRecordSchema = SchemaFactory.createForClass(MedicalRecord);