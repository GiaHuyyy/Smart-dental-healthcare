import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  doctorId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Message' }], default: [] })
  messages: Types.ObjectId[];

  @Prop({ type: Date, default: Date.now })
  lastMessageAt: Date;

  @Prop({
    type: String,
    enum: ['active', 'archived', 'closed'],
    default: 'active',
  })
  status: string;

  @Prop({ type: Boolean, default: false })
  isPatientTyping: boolean;

  @Prop({ type: Boolean, default: false })
  isDoctorTyping: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Message', default: null })
  lastMessage: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  unreadPatientCount: number;

  @Prop({ type: Number, default: 0 })
  unreadDoctorCount: number;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Compound index for efficient queries
ConversationSchema.index({ patientId: 1, doctorId: 1 }, { unique: true });
ConversationSchema.index({ lastMessageAt: -1 });
