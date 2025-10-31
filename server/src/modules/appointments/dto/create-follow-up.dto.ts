import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFollowUpDto {
  @IsNotEmpty({ message: 'ID lịch hẹn gốc không được để trống' })
  @IsString()
  parentAppointmentId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
