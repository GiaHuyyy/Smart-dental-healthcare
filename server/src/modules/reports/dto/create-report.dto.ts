import { IsArray, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import mongoose from 'mongoose';

export class CreateReportDto {
  @IsNotEmpty()
  @IsMongoId()
  userId: mongoose.Schema.Types.ObjectId;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(['pending', 'in_progress', 'resolved', 'rejected'])
  status?: string;

  @IsOptional()
  @IsMongoId()
  assignedTo?: mongoose.Schema.Types.ObjectId;

  @IsOptional()
  @IsString()
  resolution?: string;

  @IsOptional()
  @IsMongoId()
  refId?: mongoose.Schema.Types.ObjectId;

  @IsOptional()
  @IsEnum(['Appointment', 'MedicalRecord', 'Payment'])
  refModel?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  participants?: mongoose.Schema.Types.ObjectId[];
}