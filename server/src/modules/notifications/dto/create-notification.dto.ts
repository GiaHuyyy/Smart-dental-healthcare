import { IsBoolean, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import mongoose from 'mongoose';

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsNotEmpty()
  @IsMongoId()
  userId: mongoose.Schema.Types.ObjectId;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsNotEmpty()
  @IsEnum(['appointment', 'medical-record', 'payment', 'system'])
  type: string;

  @IsOptional()
  @IsMongoId()
  refId?: mongoose.Schema.Types.ObjectId;

  @IsOptional()
  @IsEnum(['Appointment', 'MedicalRecord', 'Payment'])
  refModel?: string;
}