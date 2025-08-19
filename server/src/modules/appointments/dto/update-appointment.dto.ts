import { PartialType } from '@nestjs/mapped-types';
import { CreateAppointmentDto } from './create-appointment.dto';
import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { AppointmentStatus } from '../schemas/appointment.schemas';

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: string;

  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @IsOptional()
  @IsMongoId()
  previousAppointmentId?: string;
}