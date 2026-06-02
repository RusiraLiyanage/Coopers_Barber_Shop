import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ExpiredAccessTokenException,
  GuardAuthenticationService,
  type AuthTokensResponse,
  type JwtRequestUser,
} from '@coopers/common';
import { ProxyRequestOptions, ProxyResponse } from './proxy.types';
import { ProxyService } from './proxy.service';

type ProtectedForwardOptions = Omit<
  ProxyRequestOptions,
  'target' | 'headers'
> & {
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

function createUserContextHeaders(
  authorizationHeader: string,
  user: JwtRequestUser,
): Record<string, string> {
  return {
    authorization: authorizationHeader,
    'x-user-id': user.userId,
    'x-user-email': user.email,
    'x-user-role': user.role,
  };
}

@Injectable()
export class ProtectedProxyService {
  constructor(
    private readonly authenticationService: GuardAuthenticationService,
    private readonly proxyService: ProxyService,
  ) {}

  async forward(
    options: ProtectedForwardOptions,
  ): Promise<ProtectedProxyResponse> {
    const context = await this.authenticateOrRefresh(
      options.authorizationHeader,
      options.refreshToken,
    );
    const result = await this.proxyService.forward({
      target: 'booking',
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

  private async authenticateOrRefresh(
    authorizationHeader: string | undefined,
    refreshToken: string | undefined,
  ): Promise<AuthenticatedProxyContext> {
    try {
      const user =
        await this.authenticationService.authenticateBearerToken(
          authorizationHeader,
        );

      return {
        authorizationHeader: authorizationHeader ?? '',
        user,
      };
    } catch (error) {
      if (!(error instanceof ExpiredAccessTokenException)) {
        throw error;
      }

      const refreshedTokens = await this.refreshTokens(refreshToken);
      const refreshedAuthorizationHeader = `Bearer ${refreshedTokens.access_token}`;
      const user = await this.authenticationService.authenticateBearerToken(
        refreshedAuthorizationHeader,
      );

      return {
        authorizationHeader: refreshedAuthorizationHeader,
        user,
        refreshedTokens,
      };
    }
  }

  private async refreshTokens(
    refreshToken: string | undefined,
  ): Promise<AuthTokensResponse> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    const result = await this.proxyService.forward({
      target: 'auth',
      method: 'POST',
      path: '/auth/refresh',
      body: {
        refresh_token: refreshToken,
      },
    });

    if (result.statusCode === 401) {
      throw new UnauthorizedException('Session expired. Please login again.');
    }

    if (result.statusCode >= 400 || !isAuthTokensResponse(result.body)) {
      throw new ServiceUnavailableException('Unable to refresh session.');
    }

    return result.body;
  }
}
