import { PartialType } from '@nestjs/mapped-types';
import { CreateReportDto } from './create-report.dto';
import { IsMongoId, IsNotEmpty } from 'class-validator';
import mongoose from 'mongoose';

export class UpdateReportDto extends PartialType(CreateReportDto) {
  @IsNotEmpty()
  @IsMongoId()
  _id: mongoose.Schema.Types.ObjectId;
}