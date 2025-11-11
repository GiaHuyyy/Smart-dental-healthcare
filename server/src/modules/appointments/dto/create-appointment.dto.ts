import {
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { AppointmentStatus } from '../schemas/appointment.schemas';

export class CreateAppointmentDto {
  @IsNotEmpty()
  @IsMongoId()
  patientId: string;

  @IsNotEmpty()
  @IsMongoId()
  doctorId: string;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  appointmentDate: Date;

  @IsNotEmpty()
  @IsString()
  startTime: string;

  @IsNotEmpty()
  @IsString()
  endTime: string;

  @IsNotEmpty()
  @IsNumber()
  duration: number;

  @IsNotEmpty()
  @IsString()
  appointmentType: string;

  @IsOptional()
  @IsNumber()
  consultationFee: number;

  @IsOptional()
  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  notes: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status: string;

  @IsOptional()
  @IsString()
  cancellationReason: string;

  @IsOptional()
  @Transform(({ value }) => Boolean(value))
  isRescheduled: boolean;

  @IsOptional()
  @IsMongoId()
  previousAppointmentId: string;

  @IsOptional()
  @IsMongoId()
  medicalRecordId: string;

  @IsOptional()
  @IsString()
  voucherCode: string;

  @IsOptional()
  @IsMongoId()
  voucherId: string;

  @IsOptional()
  @IsMongoId()
  followUpParentId: string;

  @IsOptional()
  aiAnalysisData?: {
    symptoms?: string;
    uploadedImage?: string;
    analysisResult?: any;
    urgency?: string;
    hasImageAnalysis?: boolean;
  };
}
