import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/modules/users/schemas/user.schemas';

export type MedicalRecordDocument = HydratedDocument<MedicalRecord>;

@Schema({ timestamps: true })
export class MedicalRecord {
  _id: mongoose.Schema.Types.ObjectId;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
  })
  patientId: mongoose.Schema.Types.ObjectId;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
  })
  doctorId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true })
  recordDate: Date;

  // Chief complaints - support both single and multiple
  @Prop()
  chiefComplaint: string;

  @Prop({ type: [String] })
  chiefComplaints: string[];

  @Prop()
  presentIllness: string;

  @Prop()
  physicalExamination: string;

  @Prop({ type: Object })
  vitalSigns: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
  };

  // Diagnoses - support both single and multiple
  @Prop()
  diagnosis: string;

  @Prop({ type: [String] })
  diagnoses: string[];

  @Prop({ type: [{ type: Object }] })
  diagnosisGroups: {
    diagnosis: string;
    treatmentPlans: string[];
  }[];

  // Treatment plans - support both single and multiple
  @Prop()
  treatmentPlan: string;

  @Prop({ type: [String] })
  treatmentPlans: string[];

  // Medications - support both simple and detailed
  @Prop({ type: [String] })
  medications: string[];

  @Prop({ type: [{ type: Object }] })
  detailedMedications: {
    name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
  }[];

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

  @Prop({ type: Date, default: null })
  followUpDate?: Date | null;

  @Prop({ type: String, default: null })
  followUpTime?: string | null;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null,
  })
  followUpAppointmentId?: mongoose.Types.ObjectId | null;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalRecord',
    default: null,
  })
  parentRecordId?: mongoose.Types.ObjectId | null;

  @Prop({ default: 'active' })
  status: string;
}

export const MedicalRecordSchema = SchemaFactory.createForClass(MedicalRecord);
