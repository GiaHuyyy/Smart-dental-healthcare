import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: String, enum: ['patient', 'doctor'], required: true })
  senderRole: string;

  @Prop({ type: String, required: false, default: '' })
  content: string;

  @Prop({
    type: String,
    enum: ['text', 'image', 'video', 'file'],
    default: 'text',
  })
  messageType: string;

  @Prop({ type: String, default: null })
  fileUrl: string;

  @Prop({ type: String, default: null })
  fileName: string;

  @Prop({ type: String, default: null }) // MIME type: image/jpeg, video/mp4, application/pdf, etc.
  fileType: string;

  @Prop({ type: Number, default: null })
  fileSize: number;

  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  @Prop({ type: Date, default: null })
  readAt: Date;

  @Prop({ type: Boolean, default: false })
  isEdited: boolean;

  @Prop({ type: Date, default: null })
  editedAt: Date;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'Message', default: null })
  replyTo: Types.ObjectId;

  @Prop({ type: Object, default: null })
  metadata: any; // For future extensions
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes for efficient queries
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ isRead: 1 });
