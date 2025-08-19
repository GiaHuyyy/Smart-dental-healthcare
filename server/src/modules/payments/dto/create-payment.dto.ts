import { IsDate, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import mongoose from 'mongoose';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsMongoId()
  patientId: mongoose.Schema.Types.ObjectId;

  @IsNotEmpty()
  @IsMongoId()
  doctorId: mongoose.Schema.Types.ObjectId;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsEnum(['pending', 'completed', 'failed', 'refunded'])
  status: string;

  @IsNotEmpty()
  @IsEnum(['appointment', 'treatment', 'medicine', 'other'])
  type: string;

  @IsOptional()
  @IsMongoId()
  refId?: mongoose.Schema.Types.ObjectId;

  @IsOptional()
  @IsEnum(['Appointment', 'MedicalRecord'])
  refModel?: string;

  @IsOptional()
  @IsDate()
  paymentDate?: Date;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}