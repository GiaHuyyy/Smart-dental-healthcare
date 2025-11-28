import { IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateAuthDto {
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;

  @IsNotEmpty({ message: 'Tên không được để trống' })
  fullName: string;

  @IsNotEmpty({ message: 'Vai trò là bắt buộc' })
  role: string;

  @IsNotEmpty({ message: 'Giới tính không được để trống' })
  gender: string;

  @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
  address: string;

  @IsNotEmpty({ message: 'Ngày sinh không được để trống' })
  dateOfBirth: string;

  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone: string;

  // Optional avatar URL (for both patient and doctor)
  @IsOptional()
  avatarUrl: string;

  // Doctor-specific fields
  @IsOptional()
  specialty: string;

  @IsOptional()
  licenseNumber: string;

  @IsOptional()
  licenseImageUrl: string;

  @IsOptional()
  experienceYears: number;

  @IsOptional()
  qualifications: string;

  @IsOptional()
  @IsArray()
  services: string[];

  @IsOptional()
  workAddress: string;

  @IsOptional()
  latitude: number;

  @IsOptional()
  longitude: number;
}

export class CodeAuthDto {
  @IsNotEmpty({ message: 'id người dùng không được để trống' })
  id: string;

  @IsNotEmpty({ message: 'Mã xác thực không được để trống' })
  code: string;
}

export class VerifyResetCodeDto {
  @IsNotEmpty({ message: 'id người dùng không được để trống' })
  id: string;

  @IsNotEmpty({ message: 'Mã xác thực không được để trống' })
  code: string;
}

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'id người dùng không được để trống' })
  id: string;

  @IsNotEmpty({ message: 'Mã xác thực không được để trống' })
  code: string;

  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  newPassword: string;
}
