import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  fullName: string;
  @IsNotEmpty()
  @IsEmail()
  email: string;
  @IsNotEmpty()
  phone: string;
  @IsNotEmpty()
  password: string;
  @IsNotEmpty()
  dateOfBirth: Date;
  @IsNotEmpty()
  gender: string;
  @IsNotEmpty()
  address: string;
  @IsNotEmpty()
  role: string;
}
