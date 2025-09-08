import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AiChatMessageDocument = AiChatMessage & Document;

@Schema({ timestamps: true })
export class AiChatMessage {
  @Prop({ type: Types.ObjectId, ref: 'AiChatSession', required: true })
  sessionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  role: string; // 'user', 'assistant'

  @Prop({ required: true })
  content: string;

  @Prop()
  messageType: string; // 'text', 'image', 'analysis_result', 'suggestion'

  @Prop()
  imageUrl: string; // For image messages

  @Prop({ type: Object, default: {} })
  analysisData: any; // For AI analysis results

  @Prop([String])
  actionButtons: string[]; // Available action buttons

  @Prop()
  urgencyLevel: string; // If this message indicates urgency

  @Prop({ type: Object, default: {} })
  suggestedDoctor: any; // Doctor suggestion in this message

  @Prop({ default: false })
  isQuickSuggestion: boolean; // If this was from a quick suggestion

  @Prop()
  quickSuggestionType: string; // Type of quick suggestion

  @Prop({ type: Object, default: {} })
  metadata: any; // Additional metadata for analysis
}

export const AiChatMessageSchema = SchemaFactory.createForClass(AiChatMessage);
