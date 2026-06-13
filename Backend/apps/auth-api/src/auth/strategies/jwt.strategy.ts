import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload, JwtRequestUser } from '@coopers/common';

// Mirrors the booking-api strategy so auth-api also derives identity from the
// cryptographically verified access token instead of a forgeable header.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // passport-jwt only calls validate once the signature and expiry are verified.
  validate(payload: JwtPayload): JwtRequestUser {
    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sid,
    };
  }
}
