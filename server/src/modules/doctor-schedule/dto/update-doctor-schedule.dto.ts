import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Time slot DTO
export class TimeSlotDto {
  @IsString()
  @IsNotEmpty()
  time: string;

  @IsBoolean()
  isWorking: boolean;
}

// Day schedule DTO
export class DayScheduleDto {
  @IsString()
  @IsNotEmpty()
  dayKey: string;

  @IsString()
  @IsNotEmpty()
  dayName: string;

  @IsNumber()
  dayIndex: number;

  @IsBoolean()
  isWorking: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  timeSlots: TimeSlotDto[];
}

// Blocked time DTO
export class BlockedTimeDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;

  @IsEnum(['full_day', 'time_range'])
  type: 'full_day' | 'time_range';

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

// Main DTO for updating doctor schedule
export class UpdateDoctorScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayScheduleDto)
  weeklySchedule: DayScheduleDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockedTimeDto)
  blockedTimes: BlockedTimeDto[];
}
