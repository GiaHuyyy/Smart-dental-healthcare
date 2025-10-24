import { PartialType } from '@nestjs/mapped-types';
import { CreateRevenueDto } from './create-revenue.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateRevenueDto extends PartialType(CreateRevenueDto) {
  @IsOptional()
  @IsEnum(['pending', 'completed', 'withdrawn', 'cancelled'])
  status?: string;

  @IsOptional()
  withdrawnDate?: Date;

  @IsOptional()
  @IsString()
  withdrawnMethod?: string;

  @IsOptional()
  @IsString()
  withdrawnTransactionId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
