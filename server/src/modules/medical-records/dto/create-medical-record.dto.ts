import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class VitalSignsDto {
  @IsString()
  @IsOptional()
  bloodPressure?: string;

  @IsNumber()
  @IsOptional()
  heartRate?: number;

  @IsNumber()
  @IsOptional()
  temperature?: number;
}

class DentalChartItemDto {
  @IsNumber()
  @IsNotEmpty()
  toothNumber: number;

  @IsString()
  @IsNotEmpty()
  condition: string;

  @IsString()
  @IsOptional()
  treatment?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

class ProcedureDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  date: Date;

  @IsNumber()
  @IsNotEmpty()
  cost: number;

  @IsString()
  @IsNotEmpty()
  status: string;
}

export class CreateMedicalRecordDto {
  @IsMongoId()
  @IsNotEmpty()
  patientId: string;

  @IsMongoId()
  @IsNotEmpty()
  doctorId: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  recordDate: Date;

  @IsString()
  @IsNotEmpty()
  chiefComplaint: string;

  @IsObject()
  @ValidateNested()
  @Type(() => VitalSignsDto)
  @IsOptional()
  vitalSigns?: VitalSignsDto;

  @IsString()
  @IsOptional()
  diagnosis?: string;

  @IsString()
  @IsOptional()
  treatmentPlan?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  medications?: string[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DentalChartItemDto)
  @IsOptional()
  dentalChart?: DentalChartItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcedureDto)
  @IsOptional()
  procedures?: ProcedureDto[];

  @IsMongoId()
  @IsOptional()
  appointmentId?: string;

  @IsBoolean()
  @IsOptional()
  isFollowUpRequired?: boolean;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  followUpDate?: Date;

  @IsString()
  @IsOptional()
  status?: string;
}