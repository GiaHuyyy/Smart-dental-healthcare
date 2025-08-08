import { Injectable } from '@nestjs/common';
import { UsersService } from '../modules/users/users.service';
import { comparePasswordHelper } from 'src/helpers/utils';
import { JwtService } from '@nestjs/jwt';
import { CodeAuthDto, CreateAuthDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string, role: string): Promise<any> {
    const user = await this.usersService.findByEmailAndRole(username, role);
    console.log('Validating user:', user);
    console.log('Role user:', role);
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
}
