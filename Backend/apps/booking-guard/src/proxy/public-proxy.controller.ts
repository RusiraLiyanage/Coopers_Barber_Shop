import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthTokensResponse } from '@coopers/common';
import { ProxyService } from './proxy.service';
import {
  AuthCookieResponse,
  clearAuthCookies,
  getAuthorizationHeaderFromRequest,
  setAuthCookies,
} from './auth-cookie.util';
import {
  ProtectedProxyResponse,
  ProtectedProxyService,
} from './protected-proxy.service';
import { createRefreshTokenBody } from './refresh-token.util';

type AuthStatusResponse = {
  authenticated: true;
};

type StatusResponse = {
  status: (statusCode: number) => void;
};

type LoginRequestBody = {
  email: string;
  password: string;
};

type RegisterRequestBody = LoginRequestBody;

type RefreshTokenRequestBody = {
  refresh_token?: string;
};

function writeStatus(response: StatusResponse, statusCode: number): void {
  response.status(statusCode);
}

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

function isSuccessStatus(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}

function writeAuthResponse(
  response: AuthCookieResponse,
  result: { statusCode: number; body: unknown },
): unknown {
  writeStatus(response, result.statusCode);

  if (isSuccessStatus(result.statusCode) && isAuthTokensResponse(result.body)) {
    setAuthCookies(response, result.body);

    return { authenticated: true } satisfies AuthStatusResponse;
  }

  return result.body;
}

function writeSessionResponse(
  response: AuthCookieResponse,
  result: ProtectedProxyResponse,
): AuthStatusResponse {
  writeStatus(response, result.statusCode);

  if (result.refreshedTokens) {
    setAuthCookies(response, result.refreshedTokens);
  }

  return { authenticated: true };
}

@ApiTags('guard-public-proxy')
@Controller()
export class PublicProxyController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly protectedProxyService: ProtectedProxyService,
  ) {}

  @ApiOperation({ summary: 'Proxy customer login to auth-api' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'customer@example.com' },
        password: { type: 'string', example: 'password123' },
      },
    },
  })
  @Post('auth/login')
  async login(
    @Body() body: LoginRequestBody,
    @Res({ passthrough: true }) response: AuthCookieResponse,
  ): Promise<unknown> {
    const result = await this.proxyService.forward({
      target: 'auth',
      method: 'POST',
      path: '/auth/login',
      body,
    });

    return writeAuthResponse(response, result);
  }

  @ApiOperation({ summary: 'Proxy customer registration to auth-api' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'customer@example.com' },
        password: { type: 'string', example: 'password123' },
      },
    },
  })
  @Post('auth/register')
  async register(
    @Body() body: RegisterRequestBody,
    @Res({ passthrough: true }) response: AuthCookieResponse,
  ): Promise<unknown> {
    const result = await this.proxyService.forward({
      target: 'auth',
      method: 'POST',
      path: '/auth/register',
      body,
    });

    return writeAuthResponse(response, result);
  }

  @ApiOperation({ summary: 'Validate current guard cookie session' })
  @Get('auth/session')
  async session(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Headers('x-refresh-token') refreshTokenHeader: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: AuthCookieResponse,
  ): Promise<AuthStatusResponse> {
    const result = await this.protectedProxyService.validateSession({
      authorizationHeader: getAuthorizationHeaderFromRequest(
        authorizationHeader,
        cookieHeader,
      ),
      refreshToken: createRefreshTokenBody(refreshTokenHeader, cookieHeader, {})
        .refresh_token,
    });

    return writeSessionResponse(response, result);
  }

  @ApiOperation({ summary: 'Proxy token refresh to auth-api' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refresh_token'],
      properties: {
        refresh_token: { type: 'string', example: 'refresh-token-value' },
      },
    },
  })
  @Post('auth/refresh')
  async refresh(
    @Body() body: RefreshTokenRequestBody,
    @Headers('x-refresh-token') refreshTokenHeader: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: AuthCookieResponse,
  ): Promise<unknown> {
    const result = await this.proxyService.forward({
      target: 'auth',
      method: 'POST',
      path: '/auth/refresh',
      body: createRefreshTokenBody(refreshTokenHeader, cookieHeader, body),
    });

    return writeAuthResponse(response, result);
  }

  @ApiOperation({ summary: 'Proxy logout to auth-api' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refresh_token'],
      properties: {
        refresh_token: { type: 'string', example: 'refresh-token-value' },
      },
    },
  })
  @Post('auth/logout')
  async logout(
    @Body() body: RefreshTokenRequestBody,
    @Headers('x-refresh-token') refreshTokenHeader: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: AuthCookieResponse,
  ): Promise<unknown> {
    const result = await this.proxyService.forward({
      target: 'auth',
      method: 'POST',
      path: '/auth/logout',
      body: createRefreshTokenBody(refreshTokenHeader, cookieHeader, body),
    });

    clearAuthCookies(response);
    writeStatus(response, result.statusCode);

    return result.body;
  }

  @ApiOperation({ summary: 'Proxy public services list to booking-api' })
  @Get('services')
  async findServices(
    @Res({ passthrough: true }) response: StatusResponse,
  ): Promise<unknown> {
    const result = await this.proxyService.forward({
      target: 'booking',
      method: 'GET',
      path: '/services',
    });

    writeStatus(response, result.statusCode);

    return result.body;
  }

  @ApiOperation({ summary: 'Proxy public service lookup to booking-api' })
  @Get('services/:id')
  async findService(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: StatusResponse,
  ): Promise<unknown> {
    const result = await this.proxyService.forward({
      target: 'booking',
      method: 'GET',
      path: `/services/${id}`,
    });

    writeStatus(response, result.statusCode);

    return result.body;
  }

  @ApiOperation({ summary: 'Proxy public staff list to booking-api' })
  @Get('staff')
  async findStaff(
    @Res({ passthrough: true }) response: StatusResponse,
  ): Promise<unknown> {
    const result = await this.proxyService.forward({
      target: 'booking',
      method: 'GET',
      path: '/staff',
    });

    writeStatus(response, result.statusCode);

    return result.body;
  }

  @ApiOperation({ summary: 'Proxy public staff lookup to booking-api' })
  @Get('staff/:id')
  async findStaffMember(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: StatusResponse,
  ): Promise<unknown> {
    const result = await this.proxyService.forward({
      target: 'booking',
      method: 'GET',
      path: `/staff/${id}`,
    });

    writeStatus(response, result.statusCode);

    return result.body;
  }
}
