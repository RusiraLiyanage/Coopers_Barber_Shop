import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

function isPassportErrorInfo(info: unknown): info is { name?: string } {
  return typeof info === 'object' && info !== null && 'name' in info;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser | false | null,
    info: unknown,
  ): TUser {
    // info carries details from passport-jwt (e.g. an expired token).
    if (isPassportErrorInfo(info) && info.name === 'TokenExpiredError') {
      throw new UnauthorizedException('Session expired. Please login again.');
    }

    if (err || !user) {
      throw new UnauthorizedException('Invalid token.');
    }

    return user;
  }
}
