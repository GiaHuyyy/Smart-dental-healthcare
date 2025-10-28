import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateWalletTransactionDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(10000, { message: 'Số tiền nạp tối thiểu là 10,000 VNĐ' })
  amount: number;

  @IsEnum(['momo', 'banking', 'cash'])
  @IsNotEmpty()
  paymentMethod: string;

  @IsString()
  description?: string;
}

