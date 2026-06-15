import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ExpiredAccessTokenException,
  GuardAuthenticationService,
  SESSION_EXPIRED_CODE,
  SESSION_IDLE_EXPIRED_CODE,
  type AuthTokensResponse,
  type JwtRequestUser,
  type SessionValidationResponse,
} from '@coopers/common';
import { ProxyRequestOptions, ProxyResponse } from './proxy.types';
import { ProxyService } from './proxy.service';
import { RefreshTokenCoordinatorService } from './refresh-token-coordinator.service';

type ProtectedForwardOptions = Omit<
  ProxyRequestOptions,
  'target' | 'headers'
> & {
  target?: ProxyRequestOptions['target'];
  authorizationHeader: string | undefined;
  refreshToken: string | undefined;
};

type SessionValidationOptions = {
  authorizationHeader: string | undefined;
  refreshToken: string | undefined;
};

export type ProtectedProxyResponse = ProxyResponse & {
  refreshedTokens?: AuthTokensResponse;
};

type AuthenticatedProxyContext = {
  authorizationHeader: string;
  user: JwtRequestUser;
  refreshedTokens?: AuthTokensResponse;
};

function isAuthTokensResponse(value: unknown): value is AuthTokensResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const tokens = value as Partial<AuthTokensResponse>;

  return (
    typeof tokens.access_token === 'string' &&
    typeof tokens.refresh_token === 'string'
  );
}

function isSessionValidationResponse(
  value: unknown,
): value is SessionValidationResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const response = value as Partial<SessionValidationResponse>;

  return typeof response.active === 'boolean';
}

function isIdleExpiredSessionResponse(
  value: unknown,
): value is Extract<SessionValidationResponse, { active: false }> {
  if (!isSessionValidationResponse(value) || value.active) {
    return false;
  }

  const response = value as { code?: unknown; canExtend?: unknown };

  return (
    response.code === SESSION_IDLE_EXPIRED_CODE && response.canExtend === true
  );
}

function isIdleExpiredErrorResponse(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const response = value as { code?: unknown; canExtend?: unknown };

  return (
    response.code === SESSION_IDLE_EXPIRED_CODE && response.canExtend === true
  );
}

function isExpiredSessionResponse(
  value: unknown,
): value is Extract<SessionValidationResponse, { active: false }> {
  if (!isSessionValidationResponse(value) || value.active) {
    return false;
  }

  const response = value as { code?: unknown; canExtend?: unknown };

  return response.code === SESSION_EXPIRED_CODE && response.canExtend === false;
}

function isExpiredErrorResponse(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const response = value as { code?: unknown; canExtend?: unknown };

  return response.code === SESSION_EXPIRED_CODE && response.canExtend === false;
}

function createIdleExpiredException(): UnauthorizedException {
  return new UnauthorizedException({
    code: SESSION_IDLE_EXPIRED_CODE,
    message: 'Session expired due to inactivity',
    canExtend: true,
  });
}

function createSessionExpiredException(): UnauthorizedException {
  return new UnauthorizedException({
    code: SESSION_EXPIRED_CODE,
    message: 'Session expired. Please login again.',
    canExtend: false,
  });
}

function createUserContextHeaders(
  authorizationHeader: string,
  user: JwtRequestUser,
): Record<string, string> {
  return {
    authorization: authorizationHeader,
    'x-user-id': user.userId,
    'x-user-email': user.email,
    'x-user-role': user.role,
    'x-session-id': user.sessionId,
  };
}

@Injectable()
export class ProtectedProxyService {
  constructor(
    private readonly authenticationService: GuardAuthenticationService,
    private readonly proxyService: ProxyService,
    private readonly refreshTokenCoordinator: RefreshTokenCoordinatorService,
  ) {}

  async forward(
    options: ProtectedForwardOptions,
  ): Promise<ProtectedProxyResponse> {
    const context = await this.authenticateOrRefresh(
      options.authorizationHeader,
      options.refreshToken,
    );
    const result = await this.proxyService.forward({
      target: options.target ?? 'booking',
      method: options.method,
      path: options.path,
      query: options.query,
      body: options.body,
      headers: createUserContextHeaders(
        context.authorizationHeader,
        context.user,
      ),
    });

    return {
      ...result,
      refreshedTokens: context.refreshedTokens,
    };
  }

  async validateSession(
    options: SessionValidationOptions,
  ): Promise<ProtectedProxyResponse> {
    const context = await this.authenticateOrRefresh(
      options.authorizationHeader,
      options.refreshToken,
    );

    return {
      statusCode: 200,
      body: {
        active: true,
      },
      refreshedTokens: context.refreshedTokens,
    };
  }

  async extendSession(
    refreshToken: string | undefined,
  ): Promise<AuthTokensResponse> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    const result = await this.proxyService.forward({
      target: 'auth',
      method: 'POST',
      path: '/auth/extend',
      body: {
        refresh_token: refreshToken,
      },
    });

    if (result.statusCode === 401) {
      throw new UnauthorizedException('Session expired. Please login again.');
    }

    if (result.statusCode >= 400 || !isAuthTokensResponse(result.body)) {
      throw new ServiceUnavailableException('Unable to extend session.');
    }

    return result.body;
  }

  private async authenticateOrRefresh(
    authorizationHeader: string | undefined,
    refreshToken: string | undefined,
  ): Promise<AuthenticatedProxyContext> {
    if (!authorizationHeader && refreshToken) {
      return this.refreshAndAuthenticate(refreshToken);
    }

    try {
      const user =
        await this.authenticationService.authenticateBearerToken(
          authorizationHeader,
        );

      await this.validateActiveSession(user.sessionId);

      return {
        authorizationHeader: authorizationHeader ?? '',
        user,
      };
    } catch (error) {
      if (!(error instanceof ExpiredAccessTokenException)) {
        throw error;
      }

      return this.refreshAndAuthenticate(refreshToken);
    }
  }

  private async refreshAndAuthenticate(
    refreshToken: string | undefined,
  ): Promise<AuthenticatedProxyContext> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    const refreshedTokens = await this.refreshTokenCoordinator.getOrRefresh(
      refreshToken,
      () => this.refreshTokens(refreshToken),
    );
    const refreshedAuthorizationHeader = `Bearer ${refreshedTokens.access_token}`;
    const user = await this.authenticationService.authenticateBearerToken(
      refreshedAuthorizationHeader,
    );

    await this.validateActiveSession(user.sessionId);

    return {
      authorizationHeader: refreshedAuthorizationHeader,
      user,
      refreshedTokens,
    };
  }

  private async refreshTokens(
    refreshToken: string,
  ): Promise<AuthTokensResponse> {
    const result = await this.proxyService.forward({
      target: 'auth',
      method: 'POST',
      path: '/auth/refresh',
      body: {
        refresh_token: refreshToken,
      },
    });

    if (result.statusCode === 401) {
      if (isIdleExpiredErrorResponse(result.body)) {
        throw createIdleExpiredException();
      }

      if (isExpiredErrorResponse(result.body)) {
        throw createSessionExpiredException();
      }

      throw new UnauthorizedException('Session expired. Please login again.');
    }

    if (result.statusCode >= 400 || !isAuthTokensResponse(result.body)) {
      throw new ServiceUnavailableException('Unable to refresh session.');
    }

    return result.body;
  }

  private async validateActiveSession(sessionId: string): Promise<void> {
    const result = await this.proxyService.forward({
      target: 'auth',
      method: 'POST',
      path: '/auth/sessions/validate',
      body: {
        sessionId,
      },
    });

    if (result.statusCode === 200 && isSessionValidationResponse(result.body)) {
      if (isIdleExpiredSessionResponse(result.body)) {
        throw createIdleExpiredException();
      }

      if (isExpiredSessionResponse(result.body)) {
        throw createSessionExpiredException();
      }

      if (!result.body.active) {
        throw new UnauthorizedException('Session expired. Please login again.');
      }

      return;
    }

    throw new ServiceUnavailableException('Unable to validate session.');
  }
}
