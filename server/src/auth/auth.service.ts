import { Injectable } from '@nestjs/common';
import { UsersService } from '../modules/users/users.service';
import { comparePasswordHelper } from 'src/helpers/utils';
import { JwtService } from '@nestjs/jwt';
import {
  CodeAuthDto,
  CreateAuthDto,
  VerifyResetCodeDto,
  ResetPasswordDto,
} from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    username: string,
    pass: string,
    role: string,
  ): Promise<any> {
    const user = await this.usersService.findByEmailAndRole(username, role);
    if (user && (await comparePasswordHelper(pass, user.password))) {
      return user;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.email, sub: user._id };
    return {
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(registerDto: CreateAuthDto) {
    return await this.usersService.handleRegister(registerDto as any);
  }

  async checkCode(checkCodeDto: CodeAuthDto) {
    return await this.usersService.handleCheckCode(checkCodeDto as any);
  }

  async retryCode(email: string) {
    return await this.usersService.handleRetryCode(email);
  }

  async forgotPassword(email: string) {
    return await this.usersService.handleForgotPassword(email);
  }

  async verifyResetCode(verifyResetCodeDto: VerifyResetCodeDto) {
    return await this.usersService.handleVerifyResetCode(verifyResetCodeDto);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    return await this.usersService.handleResetPassword(resetPasswordDto);
  }
}
