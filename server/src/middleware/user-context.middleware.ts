import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserContextMiddleware implements NestMiddleware {
  constructor(private jwtService: JwtService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = this.jwtService.verify(token);
        req['user'] = decoded;
        
        // Thêm userId vào query params để các service có thể sử dụng
        if (decoded.role === 'patient') {
          req.query.patientId = decoded.sub;
        } else if (decoded.role === 'doctor') {
          req.query.doctorId = decoded.sub;
        }
      } catch (error) {
        // Token không hợp lệ, nhưng không throw error để cho phép các route public
        console.log('Invalid token in middleware:', error.message);
      }
    }
    
    next();
  }
}

