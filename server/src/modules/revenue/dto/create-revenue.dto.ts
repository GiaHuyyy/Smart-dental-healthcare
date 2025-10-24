import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import mongoose from 'mongoose';

export class CreateRevenueDto {
  @IsNotEmpty()
  @IsMongoId()
  doctorId: mongoose.Schema.Types.ObjectId;

  @IsNotEmpty()
  @IsMongoId()
  paymentId: mongoose.Schema.Types.ObjectId;

  @IsNotEmpty()
  @IsMongoId()
  patientId: mongoose.Schema.Types.ObjectId;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  platformFee?: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  netAmount: number;

  @IsNotEmpty()
  revenueDate: Date;

  @IsOptional()
  @IsEnum(['pending', 'completed', 'withdrawn', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsMongoId()
  refId?: mongoose.Schema.Types.ObjectId;

  @IsOptional()
  @IsEnum(['Appointment', 'MedicalRecord', 'Treatment'])
  refModel?: string;

  @IsOptional()
  @IsEnum(['appointment', 'treatment', 'medicine', 'other'])
  type?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
