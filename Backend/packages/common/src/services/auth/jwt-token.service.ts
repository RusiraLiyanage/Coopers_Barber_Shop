import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  AccessTokenResponse,
  AuthenticatedUser,
  AuthTokensResponse,
  JwtPayload,
  RefreshTokenResponse,
} from './auth.types';

@Injectable()
export class JwtTokenService {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(user: AuthenticatedUser): AccessTokenResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  generateRefreshToken(): RefreshTokenResponse {
    return {
      refresh_token: randomBytes(64).toString('hex'),
    };
  }

  createAuthTokens(user: AuthenticatedUser): AuthTokensResponse {
    return {
      ...this.signAccessToken(user),
      ...this.generateRefreshToken(),
    };
  }
}
