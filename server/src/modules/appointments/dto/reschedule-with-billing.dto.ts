import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class RescheduleWithBillingDto {
  @IsNotEmpty({ message: 'Ngày hẹn không được để trống' })
  @IsDateString({}, { message: 'Ngày hẹn không hợp lệ' })
  appointmentDate: string;

  @IsNotEmpty({ message: 'Giờ bắt đầu không được để trống' })
  @IsString()
  startTime: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsNotEmpty({ message: 'User ID không được để trống' })
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
