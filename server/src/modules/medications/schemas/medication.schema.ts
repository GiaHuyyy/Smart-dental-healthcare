import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type MedicationDocument = HydratedDocument<Medication>;

@Schema({ timestamps: true })
export class Medication {
  _id: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  genericName: string;

  @Prop({ required: true })
  category: string; // Antibiotic, Painkiller, Anti-inflammatory, etc.

  @Prop({ required: true })
  dentalUse: string; // Specific dental condition it treats

  @Prop({ type: [String] })
  indications: string[]; // What conditions it treats

  @Prop({ type: [String] })
  contraindications: string[]; // When not to use

  @Prop({ type: [String] })
  sideEffects: string[]; // Possible side effects

  @Prop({ type: [String] })
  dosageForms: string[]; // Tablet, capsule, liquid, gel, etc.

  @Prop({ type: [Object] })
  dosages: {
    ageGroup: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes?: string;
  }[];

  @Prop()
  instructions: string; // General usage instructions

  @Prop()
  precautions: string; // Special precautions

  @Prop()
  interactions: string; // Drug interactions

  @Prop()
  storage: string; // Storage conditions

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 'prescription' })
  prescriptionType: string; // prescription, otc (over the counter)

  @Prop()
  manufacturer: string;

  @Prop()
  price: number;

  @Prop()
  unit: string; // VND, USD, etc.

  @Prop({ type: [String] })
  tags: string[]; // For easy searching
}

export const MedicationSchema = SchemaFactory.createForClass(Medication);
