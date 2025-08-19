import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentDto } from './create-payment.dto';
import { IsMongoId, IsNotEmpty } from 'class-validator';
import mongoose from 'mongoose';

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {
  @IsNotEmpty()
  @IsMongoId()
  _id: mongoose.Schema.Types.ObjectId;
}