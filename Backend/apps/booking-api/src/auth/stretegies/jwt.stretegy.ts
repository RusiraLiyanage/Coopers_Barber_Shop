import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload, JwtRequestUser } from '../auth.types';

// This is where the JWT based authentication strategy is defined.

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        config.get<string>('JWT_SECRET') ||
        (() => {
          throw new Error('JWT_SECRET is not defined');
        })(),
    });
  }

  // the JWT payload is passed to the validate method.
  validate(payload: JwtPayload): JwtRequestUser {
    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }
    // attach user info to request
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
