import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createLoginThrottleOptions, UserRole } from '@coopers/common';
import type { AuthTokensResponse } from '@coopers/common';
import {
  AuthCookieResponse,
  clearAdminAuthCookies,
  getAdminAuthorizationHeaderFromRequest,
  getAdminRememberMeFromCookie,
  setAdminAuthCookies,
} from './auth-cookie.util';
import { createAdminRefreshTokenBody } from './refresh-token.util';
import {
  ProtectedProxyResponse,
  ProtectedProxyService,
} from './protected-proxy.service';
import { ProxyService } from './proxy.service';

type AuthStatusResponse = {
  authenticated: true;
};

type AccountProfileResponse = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  mobile: string | null;
  suburb: string | null;
  role: UserRole;
};

type AdminLoginResponse = AuthStatusResponse & {
  user: AccountProfileResponse;
};

type LoginRequestBody = {
  email: string;
  password: string;
  remember?: boolean;
  endExistingSessions?: boolean;
};

type AuthApiLoginRequestBody = {
  email: string;
  password: string;
  endExistingSessions?: boolean;
  requiredRole?: UserRole;
};

type RefreshTokenRequestBody = {
  refresh_token?: string;
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

function isAccountProfileResponse(value: unknown): value is AccountProfileResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const profile = value as Partial<AccountProfileResponse>;

  return (
    typeof profile.id === 'string' &&
    typeof profile.email === 'string' &&
    profile.role === UserRole.ADMIN
  );
}

function isSuccessStatus(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}

function writeStatus(
  response: Pick<AuthCookieResponse, 'status'>,
  statusCode: number,
): void {
  response.status(statusCode);
}

function writeAdminAuthResponse(
  response: AuthCookieResponse,
  result: { statusCode: number; body: unknown },
  rememberMe: boolean,
): unknown {
  writeStatus(response, result.statusCode);

  if (isSuccessStatus(result.statusCode) && isAuthTokensResponse(result.body)) {
    setAdminAuthCookies(response, result.body, { rememberMe });

    return { authenticated: true } satisfies AuthStatusResponse;
  }

  return result.body;
}

function writeAdminSessionResponse(
  response: AuthCookieResponse,
  result: ProtectedProxyResponse,
  rememberMe: boolean,
): AuthStatusResponse {
  writeStatus(response, result.statusCode);

  if (result.refreshedTokens) {
    setAdminAuthCookies(response, result.refreshedTokens, { rememberMe });
  }

  return { authenticated: true };
}

function createLoginAuthApiBody(
  body: LoginRequestBody,
): AuthApiLoginRequestBody {
  return {
    email: body.email,
    password: body.password,
    endExistingSessions: body.endExistingSessions,
    // This is the admin portal login, so only admin accounts may obtain a
    // session here. auth-api enforces this before any token is issued.
    requiredRole: UserRole.ADMIN,
  };
}

async function revokeIssuedTokens(
  proxyService: ProxyService,
  tokens: AuthTokensResponse,
): Promise<void> {
  await proxyService
    .forward({
      target: 'auth',
      method: 'POST',
      path: '/auth/logout',
      body: {
        refresh_token: tokens.refresh_token,
      },
    })
    .catch(() => undefined);
}

function getRememberMe(body: { remember?: boolean }): boolean {
  return body.remember === true;
}

@ApiTags('guard-admin-auth-proxy')
@Controller('admin-auth')
export class AdminAuthProxyController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly protectedProxyService: ProtectedProxyService,
  ) {}

  @ApiOperation({ summary: 'Proxy admin login to auth-api' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'admin@example.com' },
        password: { type: 'string', example: 'password123' },
        remember: { type: 'boolean', example: true },
      },
    },
  })
  @Throttle(createLoginThrottleOptions())
  @Post('login')
  async login(
    @Body() body: LoginRequestBody,
    @Res({ passthrough: true }) response: AuthCookieResponse,
  ): Promise<unknown> {
    const result = await this.proxyService.forward({
      target: 'auth',
      method: 'POST',
      path: '/auth/login',
      body: createLoginAuthApiBody(body),
    });

    if (!isSuccessStatus(result.statusCode) || !isAuthTokensResponse(result.body)) {
      return writeAdminAuthResponse(response, result, getRememberMe(body));
    }

    const profileResult = await this.proxyService.forward({
      target: 'auth',
      method: 'GET',
      path: '/auth/me',
      headers: {
        authorization: `Bearer ${result.body.access_token}`,
      },
    });

    if (
      !isSuccessStatus(profileResult.statusCode) ||
      !isAccountProfileResponse(profileResult.body)
    ) {
      await revokeIssuedTokens(this.proxyService, result.body);

      throw new ServiceUnavailableException(
        'Unable to complete admin login profile check.',
      );
    }

    writeStatus(response, result.statusCode);
    setAdminAuthCookies(response, result.body, {
      rememberMe: getRememberMe(body),
    });

    return {
      authenticated: true,
      user: profileResult.body,
    } satisfies AdminLoginResponse;
  }

  @ApiOperation({ summary: 'Validate current admin guard cookie session' })
  @Get('session')
  async session(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Headers('x-refresh-token') refreshTokenHeader: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: AuthCookieResponse,
  ): Promise<AuthStatusResponse> {
    let result: ProtectedProxyResponse;

    try {
      result = await this.protectedProxyService.validateSession({
        authorizationHeader: getAdminAuthorizationHeaderFromRequest(
          authorizationHeader,
          cookieHeader,
        ),
        refreshToken: createAdminRefreshTokenBody(
          refreshTokenHeader,
          cookieHeader,
          {},
        ).refresh_token,
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        clearAdminAuthCookies(response);
      }

      throw error;
    }

    return writeAdminSessionResponse(
      response,
      result,
      getAdminRememberMeFromCookie(cookieHeader) ?? false,
    );
  }

  @ApiOperation({ summary: 'Proxy current admin account profile to auth-api' })
  @Get('me')
  async getAccountProfile(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Headers('x-refresh-token') refreshTokenHeader: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: AuthCookieResponse,
  ): Promise<unknown> {
    const result = await this.protectedProxyService.forward({
      target: 'auth',
      authorizationHeader: getAdminAuthorizationHeaderFromRequest(
        authorizationHeader,
        cookieHeader,
      ),
      refreshToken: createAdminRefreshTokenBody(
        refreshTokenHeader,
        cookieHeader,
        {},
      ).refresh_token,
      method: 'GET',
      path: '/auth/me',
    });

    writeAdminSessionResponse(
      response,
      result,
      getAdminRememberMeFromCookie(cookieHeader) ?? false,
    );

    return result.body;
  }

  @ApiOperation({ summary: 'Extend an idle admin guard cookie session' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refresh_token'],
      properties: {
        refresh_token: { type: 'string', example: 'refresh-token-value' },
      },
    },
  })
  @Post('extend')
  async extend(
    @Body() body: RefreshTokenRequestBody,
    @Headers('x-refresh-token') refreshTokenHeader: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: AuthCookieResponse,
  ): Promise<AuthStatusResponse> {
    const tokens = await this.protectedProxyService.extendSession(
      createAdminRefreshTokenBody(refreshTokenHeader, cookieHeader, body)
        .refresh_token,
    );

    setAdminAuthCookies(response, tokens, {
      rememberMe: getAdminRememberMeFromCookie(cookieHeader) ?? false,
    });
    writeStatus(response, 200);

    return { authenticated: true };
  }

  @ApiOperation({ summary: 'Proxy admin logout to auth-api' })
  @Post('logout')
  async logout(
    @Body() body: RefreshTokenRequestBody,
    @Headers('x-refresh-token') refreshTokenHeader: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: AuthCookieResponse,
  ): Promise<unknown> {
    const logoutBody = createAdminRefreshTokenBody(
      refreshTokenHeader,
      cookieHeader,
      body,
    );

    if (!logoutBody.refresh_token) {
      clearAdminAuthCookies(response);
      writeStatus(response, 200);

      return { success: true };
    }

    try {
      const result = await this.proxyService.forward({
        target: 'auth',
        method: 'POST',
        path: '/auth/logout',
        body: logoutBody,
      });

      writeStatus(response, result.statusCode);

      return result.body;
    } finally {
      clearAdminAuthCookies(response);
    }
  }
}
