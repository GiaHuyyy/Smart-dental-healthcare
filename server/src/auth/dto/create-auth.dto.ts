import { IsNotEmpty } from 'class-validator';

export class CreateAuthDto {
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;

  @IsNotEmpty({ message: 'Tên không được để trống' })
  fullName: string;

  @IsNotEmpty({ message: 'Vai trò là bắt buộc' })
  role: string;
}
