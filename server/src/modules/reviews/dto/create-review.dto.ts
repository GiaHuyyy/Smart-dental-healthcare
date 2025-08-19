import { IsBoolean, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import mongoose from 'mongoose';

export class CreateReviewDto {
  @IsNotEmpty()
  @IsMongoId()
  patientId: mongoose.Schema.Types.ObjectId;

  @IsNotEmpty()
  @IsMongoId()
  doctorId: mongoose.Schema.Types.ObjectId;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsNotEmpty()
  @IsString()
  comment: string;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsMongoId()
  refId?: mongoose.Schema.Types.ObjectId;

  @IsOptional()
  @IsEnum(['Appointment', 'MedicalRecord'])
  refModel?: string;
}