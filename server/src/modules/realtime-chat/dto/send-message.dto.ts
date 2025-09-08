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

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(['text', 'image', 'file'])
  messageType?: string = 'text';

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  fileSize?: number;

  @IsOptional()
  @IsMongoId()
  replyTo?: Types.ObjectId;
}
