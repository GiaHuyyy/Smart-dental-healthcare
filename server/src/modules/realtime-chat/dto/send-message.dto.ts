import {
  IsNotEmpty,
  IsString,
  IsMongoId,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Types } from 'mongoose';

export class SendMessageDto {
  @IsNotEmpty()
  @IsMongoId()
  conversationId: Types.ObjectId;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(['text', 'image', 'video', 'file', 'call'])
  messageType?: string = 'text';

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  fileType?: string;

  @IsOptional()
  fileSize?: number;

  @IsOptional()
  @IsMongoId()
  replyTo?: Types.ObjectId;

  @IsOptional()
  callData?: {
    callType: 'audio' | 'video';
    callStatus: 'missed' | 'answered' | 'rejected' | 'completed';
    callDuration: number;
    startedAt: Date;
    endedAt?: Date;
  };

  @IsOptional()
  receiverId?: Types.ObjectId;
}
