import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    // info contains details from passport-jwt
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException('Session expired. Please login again.');
    }

    if (err || !user) {
      throw new UnauthorizedException('Invalid token.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user;
  }
}
