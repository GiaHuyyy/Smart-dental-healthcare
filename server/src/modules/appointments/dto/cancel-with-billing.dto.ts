import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CancelWithBillingDto {
  @IsNotEmpty({ message: 'Lý do hủy không được để trống' })
  @IsString()
  reason: string;

  @IsNotEmpty({ message: 'Người hủy không được để trống' })
  @IsEnum(['patient', 'doctor'], {
    message: 'Người hủy phải là patient hoặc doctor',
  })
  cancelledBy: 'patient' | 'doctor';

  @IsOptional()
  @IsEnum(['emergency', 'patient_late'], {
    message: 'Lý do bác sĩ hủy phải là emergency hoặc patient_late',
  })
  doctorReason?: 'emergency' | 'patient_late';
}
