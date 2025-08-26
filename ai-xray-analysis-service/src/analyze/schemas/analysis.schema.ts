import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AnalysisDocument = Analysis & Document;

@Schema({ timestamps: true })
export class Analysis {
  @Prop({ required: true })
  imageUrl: string;

  @Prop({ required: true })
  diagnosis: string;

  @Prop({ required: true, min: 0, max: 100 })
  confidence: number;

  @Prop({ required: true, enum: ['low', 'medium', 'high', 'critical'] })
  severity: string;

  @Prop({ type: Object })
  detailedFindings: {
    teethCondition: string;
    boneStructure: string;
    gumHealth: string;
    pulpCondition: string;
    cavities: string;
    periodontalStatus: string;
  };

  @Prop([String])
  recommendations: string[];

  @Prop({ type: Object })
  treatmentPlan: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };

  @Prop([String])
  riskFactors: string[];

  @Prop({ type: Object })
  estimatedCost: {
    immediate: { min: number; max: number };
    total: { min: number; max: number };
    currency: string;
  };

  @Prop({ type: Object })
  costBreakdown: {
    consultation: number;
    treatment: number;
    followUp: number;
    emergency: number;
  };

  @Prop([String])
  followUpSchedule: string[];

  @Prop([String])
  preventiveMeasures: string[];

  @Prop({ type: Object })
  imageQuality: {
    resolution: string;
    clarity: string;
    positioning: string;
    overall: string;
  };

  @Prop({ type: Object })
  metadata: {
    processingTime: number;
    aiModel: string;
    analysisVersion: string;
    timestamp: Date;
  };

  @Prop({ default: 'gemini' })
  analysisSource: string;

  @Prop()
  originalFilename: string;

  @Prop()
  fileSize: number;

  @Prop()
  mimeType: string;
}

export const AnalysisSchema = SchemaFactory.createForClass(Analysis);