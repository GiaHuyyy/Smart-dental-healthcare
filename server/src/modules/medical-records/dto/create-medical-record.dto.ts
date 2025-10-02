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

class MedicationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  dosage?: string;

  @IsString()
  @IsOptional()
  frequency?: string;

  @IsString()
  @IsOptional()
  duration?: string;

  @IsString()
  @IsOptional()
  instructions?: string;
}

class DiagnosisGroupDto {
  @IsString()
  @IsNotEmpty()
  diagnosis: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  treatmentPlans?: string[];
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

  // Support both single and multiple chief complaints
  @IsString()
  @IsOptional()
  chiefComplaint?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  chiefComplaints?: string[];

  @IsString()
  @IsOptional()
  presentIllness?: string;

  @IsString()
  @IsOptional()
  physicalExamination?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => VitalSignsDto)
  @IsOptional()
  vitalSigns?: VitalSignsDto;

  // Support both single and multiple diagnoses
  @IsString()
  @IsOptional()
  diagnosis?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  diagnoses?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiagnosisGroupDto)
  @IsOptional()
  diagnosisGroups?: DiagnosisGroupDto[];

  // Support both single and multiple treatment plans
  @IsString()
  @IsOptional()
  treatmentPlan?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  treatmentPlans?: string[];

  // Support both simple and detailed medications
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  medications?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicationDto)
  @IsOptional()
  detailedMedications?: MedicationDto[];

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
  followUpTime?: string;

  @IsString()
  @IsOptional()
  status?: string;
}