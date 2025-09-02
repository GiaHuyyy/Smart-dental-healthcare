import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsDate,
    IsMongoId,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';

class MedicationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  dosage: string;

  @IsString()
  @IsNotEmpty()
  frequency: string;

  @IsString()
  @IsNotEmpty()
  duration: string;

  @IsString()
  @IsNotEmpty()
  instructions: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unit: string;
}

export class CreatePrescriptionDto {
  @IsMongoId()
  @IsNotEmpty()
  patientId: string;

  @IsMongoId()
  @IsOptional()
  doctorId?: string;

  @IsMongoId()
  @IsOptional()
  medicalRecordId?: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  prescriptionDate: Date;

  @IsString()
  @IsNotEmpty()
  diagnosis: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicationDto)
  @IsNotEmpty()
  medications: MedicationDto[];

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isFollowUpRequired?: boolean;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  followUpDate?: Date;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}
