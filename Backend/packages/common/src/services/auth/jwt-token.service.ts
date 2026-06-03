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

  signAccessToken(
    user: AuthenticatedUser,
    sessionId: string,
  ): AccessTokenResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sid: sessionId,
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

  createAuthTokens(
    user: AuthenticatedUser,
    sessionId: string,
  ): AuthTokensResponse {
    return {
      ...this.signAccessToken(user, sessionId),
      ...this.generateRefreshToken(),
    };
  }
}
