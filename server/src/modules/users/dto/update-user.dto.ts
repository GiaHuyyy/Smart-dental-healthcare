import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  MinLength,
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

  @IsOptional()
  latitude?: number;

  @IsOptional()
  longitude?: number;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class ChangePasswordDto {
  @IsMongoId({
    message: 'ID người dùng phải là một ID hợp lệ',
  })
  @IsNotEmpty({
    message: 'ID người dùng không được để trống',
  })
  _id: string;

  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu hiện tại không được để trống' })
  currentPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  newPassword: string;
}
