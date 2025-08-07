import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super(
      {
        passReqToCallback: true
      }
    );
  }

  async validate(req: any, username: string, password: string): Promise<any> {
    const role = req.body.role;
    const user = await this.authService.validateUser(username, password, role);
    if (!user) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không hợp lệ');
    }
    if (user.isActive === false) {
      throw new BadRequestException('Tài khoản chưa được kích hoạt');
    }
    return user;
  }
}
