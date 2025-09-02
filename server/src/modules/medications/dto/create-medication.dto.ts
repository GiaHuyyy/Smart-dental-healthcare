import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';

class DosageDto {
  @IsString()
  @IsNotEmpty()
  ageGroup: string;

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
  @IsOptional()
  notes?: string;
}

export class CreateMedicationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  genericName: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  dentalUse: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  indications: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  contraindications?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sideEffects?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  dosageForms: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DosageDto)
  @IsNotEmpty()
  dosages: DosageDto[];

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsString()
  @IsOptional()
  precautions?: string;

  @IsString()
  @IsOptional()
  interactions?: string;

  @IsString()
  @IsOptional()
  storage?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  prescriptionType?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
