import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@coopers/entities';
import type { JwtPayload, JwtRequestUser } from '../auth';

export class ExpiredAccessTokenException extends UnauthorizedException {
  constructor() {
    super('Session expired. Please login again.');
  }
}

function isJwtPayload(value: unknown): value is JwtPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const payload = value as Partial<JwtPayload>;

  return (
    typeof payload.sub === 'string' &&
    typeof payload.email === 'string' &&
    typeof payload.sid === 'string' &&
    payload.role !== undefined &&
    Object.values(UserRole).includes(payload.role)
  );
}

function isTokenExpiredError(error: unknown): boolean {
  return error instanceof Error && error.name === 'TokenExpiredError';
}

@Injectable()
export class GuardAuthenticationService {
  constructor(private readonly jwtService: JwtService) {}

  async authenticateBearerToken(
    authorizationHeader: string | undefined,
  ): Promise<JwtRequestUser> {
    const token = this.extractBearerToken(authorizationHeader);

    try {
      const payload =
        await this.jwtService.verifyAsync<Record<string, unknown>>(token);

      if (!isJwtPayload(payload)) {
        throw new UnauthorizedException('Invalid token payload.'); // the frontend needs to provide a valid token payload
      }

      return {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        sessionId: payload.sid,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (isTokenExpiredError(error)) {
        throw new ExpiredAccessTokenException();
      }

      throw new UnauthorizedException('Invalid token.');
    }
  }

  private extractBearerToken(authorizationHeader: string | undefined): string {
    if (!authorizationHeader) {
      throw new UnauthorizedException('Missing access token.');
    }

    const [scheme, token] = authorizationHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header.');
    }

    return token;
  }
}
