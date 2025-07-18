import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class UpdateUserDto {
  @IsMongoId({
    message: 'ID người dùng phải là một ID hợp lệ',
  })
  @IsNotEmpty({
    message: 'ID người dùng không được để trống',
  })
  _id: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Họ và tên không được để trống khi cung cấp' })
  fullName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại không được để trống khi cung cấp' })
  phone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: Date;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Giới tính không được để trống khi cung cấp' })
  gender?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ không được để trống khi cung cấp' })
  address?: string;
}
