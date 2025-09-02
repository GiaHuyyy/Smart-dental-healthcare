import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/modules/users/schemas/user.schemas';

export type PrescriptionDocument = HydratedDocument<Prescription>;

@Schema({ timestamps: true })
export class Prescription {
  _id: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: User.name })
  patientId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: User.name })
  doctorId: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord' })
  medicalRecordId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true })
  prescriptionDate: Date;

  @Prop({ required: true })
  diagnosis: string;

  @Prop({ type: [Object] })
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
    quantity: number;
    unit: string;
  }[];

  @Prop()
  instructions: string;

  @Prop()
  notes: string;

  @Prop({ default: 'active' })
  status: string;

  @Prop({ default: false })
  isDispensed: boolean;

  @Prop()
  dispensedDate?: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  dispensedBy?: mongoose.Schema.Types.ObjectId;

  @Prop({ default: false })
  isFollowUpRequired: boolean;

  @Prop()
  followUpDate?: Date;

  @Prop({ type: [String] })
  attachments: string[];
}

export const PrescriptionSchema = SchemaFactory.createForClass(Prescription);
