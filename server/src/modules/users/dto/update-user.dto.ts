import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class UpdateUserDto {
  @IsMongoId({
    message: 'Invalid user ID format',
  })
  @IsNotEmpty({
    message: 'User ID cannot be empty',
  })
  _id: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Full name cannot be empty when provided' })
  fullName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Phone cannot be empty when provided' })
  phone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: Date;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Gender cannot be empty when provided' })
  gender?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Address cannot be empty when provided' })
  address?: string;
}
