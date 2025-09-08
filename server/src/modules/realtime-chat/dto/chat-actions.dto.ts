import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class MarkMessageReadDto {
  @IsNotEmpty()
  @IsMongoId()
  conversationId: Types.ObjectId;

  @IsNotEmpty()
  @IsMongoId()
  messageId: Types.ObjectId;
}

export class TypingStatusDto {
  @IsNotEmpty()
  @IsMongoId()
  conversationId: Types.ObjectId;

  @IsNotEmpty()
  @IsString()
  isTyping: boolean;
}
