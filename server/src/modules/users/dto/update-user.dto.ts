import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  MinLength,
  IsNumber,
  IsArray,
  Min,
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

  // Doctor-specific fields
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Chuyên khoa không được để trống khi cung cấp' })
  specialty?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({
    message: 'Số chứng chỉ hành nghề không được để trống khi cung cấp',
  })
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  licenseImageUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Số năm kinh nghiệm phải >= 0' })
  experienceYears?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Bằng cấp không được để trống khi cung cấp' })
  qualifications?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];

  @IsOptional()
  @IsString()
  @IsNotEmpty({
    message: 'Địa chỉ nơi làm việc không được để trống khi cung cấp',
  })
  workAddress?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Phí tư vấn phải >= 0' })
  consultationFee?: number;
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
