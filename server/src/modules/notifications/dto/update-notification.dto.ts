import { PartialType } from '@nestjs/mapped-types';
import { CreateNotificationDto } from './create-notification.dto';
import { IsMongoId, IsNotEmpty } from 'class-validator';
import mongoose from 'mongoose';

export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {
  @IsNotEmpty()
  @IsMongoId()
  _id: mongoose.Schema.Types.ObjectId;
}