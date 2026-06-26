import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JWT_AUDIENCE, JWT_ISSUER } from '@coopers/common';
import { UserRole } from '@coopers/entities';
import type { JwtPayload, JwtRequestUser } from '../auth/auth.types';

const ADMIN_ACCESS_TOKEN_COOKIE = 'admin_tsa';

type SocketHandshake = {
  auth?: {
    token?: unknown;
  };
  headers: {
    authorization?: string | string[];
    cookie?: string;
  };
};

function isJwtPayload(value: unknown): value is JwtPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const payload = value as Partial<JwtPayload>;

  return (
    typeof payload.sub === 'string' &&
    typeof payload.email === 'string' &&
    Object.values(UserRole).includes(payload.role as UserRole)
  );
}

function getCookieValue(
  cookieHeader: string | undefined,
  cookieName: string,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const cookiePrefix = `${cookieName}=`;
  const cookie = cookies.find((value) => value.startsWith(cookiePrefix));

  if (!cookie) {
    return undefined;
  }

  const rawValue = cookie.slice(cookiePrefix.length);

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

function getAuthorizationToken(
  authorizationHeader: string | string[] | undefined,
): string | undefined {
  const header = Array.isArray(authorizationHeader)
    ? authorizationHeader[0]
    : authorizationHeader;
  const [scheme, token] = header?.split(' ') ?? [];

  return scheme === 'Bearer' && token ? token : undefined;
}

@Injectable()
export class AdminRealtimeAuthService {
  constructor(private readonly jwtService: JwtService) {}

  async authenticateHandshake(
    handshake: SocketHandshake,
  ): Promise<JwtRequestUser> {
    const token =
      this.getHandshakeAuthToken(handshake) ??
      getAuthorizationToken(handshake.headers.authorization) ??
      getCookieValue(handshake.headers.cookie, ADMIN_ACCESS_TOKEN_COOKIE);

    if (!token) {
      throw new UnauthorizedException('Missing admin realtime token.');
    }

    const payload = await this.jwtService.verifyAsync<Record<string, unknown>>(
      token,
      {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      },
    );

    if (!isJwtPayload(payload) || payload.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Admin realtime access required.');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sid,
    };
  }

  private getHandshakeAuthToken(
    handshake: SocketHandshake,
  ): string | undefined {
    const token = handshake.auth?.token;

    return typeof token === 'string' && token.trim() ? token.trim() : undefined;
  }
}
