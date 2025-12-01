import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateWithdrawalRequestDto {
  @IsNumber()
  @Min(10000, { message: 'Số tiền rút tối thiểu là 10,000 VNĐ' })
  amount: number;

  @IsEnum(['momo', 'bank_transfer'])
  @IsNotEmpty()
  withdrawMethod: string;

  // MoMo info
  @IsString()
  @IsOptional()
  momoPhone?: string;

  @IsString()
  @IsOptional()
  momoName?: string;

  // Bank info (for future expansion)
  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @IsString()
  @IsOptional()
  bankAccountName?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
