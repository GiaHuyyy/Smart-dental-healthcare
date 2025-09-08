import { IsNotEmpty, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class CreateConversationDto {
  @IsNotEmpty()
  @IsMongoId()
  patientId: Types.ObjectId;

  @IsNotEmpty()
  @IsMongoId()
  doctorId: Types.ObjectId;
}
