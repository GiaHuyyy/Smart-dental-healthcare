import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { Public, ResponseMessage } from 'src/decorator/customize';
import {
  CodeAuthDto,
  CreateAuthDto,
  VerifyResetCodeDto,
  ResetPasswordDto,
} from './dto/create-auth.dto';
import { SendGridService } from '../mail/sendgrid.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sendGridService: SendGridService,
  ) {}

  @Post('login')
  @Public()
  @UseGuards(LocalAuthGuard)
  @ResponseMessage('Fetch login')
  handleLogin(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('register')
  @Public()
  @ResponseMessage('Đăng ký tài khoản thành công')
  register(@Body() registerDto: CreateAuthDto) {
    return this.authService.register(registerDto);
  }

  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @Get('mail')
  @Public()
  async sendMail() {
    await this.sendGridService.sendMail({
      to: 'huygiavuto@gmail.com',
      subject: 'Testing SendGrid ✔',
      template: 'register',
      context: {
        name: 'Userrrr',
        activationCode: 123456,
      },
    });
    return 'Email sent successfully!';
  }

  @Post('check-code')
  @Public()
  @ResponseMessage('Kích hoạt tài khoản thành công')
  checkCode(@Body() checkCodeDto: CodeAuthDto) {
    return this.authService.checkCode(checkCodeDto);
  }

  @Post('retry-code')
  @Public()
  retryCode(@Body('email') email: string) {
    return this.authService.retryCode(email);
  }

  @Post('forgot-password')
  @Public()
  forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('verify-reset-code')
  @Public()
  verifyResetCode(@Body() verifyResetCodeDto: VerifyResetCodeDto) {
    return this.authService.verifyResetCode(verifyResetCodeDto);
  }

  @Post('reset-password')
  @Public()
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
