import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AiChatSessionDocument = AiChatSession & Document;

@Schema({ timestamps: true })
export class AiChatSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  sessionId: string; // Unique ID for each chat session

  @Prop({ default: 'active' })
  status: string; // 'active', 'completed', 'archived'

  @Prop()
  symptoms: string; // Initial symptoms or complaint

  @Prop()
  urgencyLevel: string; // 'low', 'medium', 'high'

  @Prop({ type: Types.ObjectId, ref: 'User' })
  suggestedDoctorId: Types.ObjectId; // Doctor suggested by AI

  @Prop({ type: Object })
  suggestedDoctor: any; // full suggested doctor object snapshot

  @Prop()
  finalAction: string; // 'appointment_booked', 'self_care', 'emergency_referral'

  @Prop({ default: 0 })
  messageCount: number;

  @Prop()
  summary: string; // AI-generated summary of the session

  @Prop({ default: false })
  hasImageAnalysis: boolean;

  @Prop([String])
  imageUrls: string[]; // URLs of uploaded images

  @Prop({ type: Object, default: {} })
  analysisResults: any; // Store image analysis results

  @Prop()
  patientSatisfaction: number; // 1-5 rating if provided

  @Prop()
  followUpNeeded: boolean;

  @Prop({ type: [String], default: [] })
  tags: string[]; // ['dental_pain', 'emergency', 'preventive', etc.]
}

export const AiChatSessionSchema = SchemaFactory.createForClass(AiChatSession);
