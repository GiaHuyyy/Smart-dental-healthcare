import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateFollowUpDto {
  @IsNotEmpty({ message: 'ID lịch hẹn gốc không được để trống' })
  @IsString()
  parentAppointmentId: string;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày đề xuất không hợp lệ' })
  suggestedDate?: string;

  @IsOptional()
  @IsString()
  suggestedTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
