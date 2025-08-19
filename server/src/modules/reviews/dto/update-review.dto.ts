import { PartialType } from '@nestjs/mapped-types';
import { CreateReviewDto } from './create-review.dto';
import { IsMongoId, IsNotEmpty } from 'class-validator';
import mongoose from 'mongoose';

export class UpdateReviewDto extends PartialType(CreateReviewDto) {
  @IsNotEmpty()
  @IsMongoId()
  _id: mongoose.Schema.Types.ObjectId;
}