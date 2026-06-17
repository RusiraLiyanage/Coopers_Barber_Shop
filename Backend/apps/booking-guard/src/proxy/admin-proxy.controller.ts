import { All, Controller, Headers, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ProtectedProxyResponse,
  ProtectedProxyService,
} from './protected-proxy.service';
import {
  AuthCookieResponse,
  getAdminAuthorizationHeaderFromRequest,
  getAdminRememberMeFromCookie,
  setAdminAuthCookies,
} from './auth-cookie.util';
import { getAdminRefreshTokenFromRequest } from './refresh-token.util';

type AdminProxyRequest = {
  method: string;
  originalUrl?: string;
  url?: string;
  body?: unknown;
};

function writeProxyResponse(
  response: AuthCookieResponse,
  result: ProtectedProxyResponse,
  rememberMe: boolean,
): void {
  response.status(result.statusCode);

  if (result.refreshedTokens) {
    setAdminAuthCookies(response, result.refreshedTokens, { rememberMe });
  }
}

function createAdminProxyUrl(request: AdminProxyRequest): URL {
  const originalUrl = request.originalUrl ?? request.url ?? '/admin';

  return new URL(originalUrl, 'http://guard.local');
}

function createProxyQuery(
  searchParams: URLSearchParams,
): Record<string, string | string[] | undefined> {
  const query: Record<string, string | string[] | undefined> = {};

  searchParams.forEach((value, key) => {
    const existingValue = query[key];

    if (Array.isArray(existingValue)) {
      existingValue.push(value);
      return;
    }

    if (typeof existingValue === 'string') {
      query[key] = [existingValue, value];
      return;
    }

    query[key] = value;
  });

  return query;
}

function shouldForwardBody(method: string): boolean {
  return !['GET', 'HEAD'].includes(method.toUpperCase());
}

@ApiTags('guard-admin-proxy')
@ApiBearerAuth('access-token')
@Controller('admin')
export class AdminProxyController {
  constructor(private readonly protectedProxyService: ProtectedProxyService) {}

  @ApiOperation({ summary: 'Proxy authenticated admin requests to admin-api' })
  @All('*path')
  async forwardAdminRequest(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Headers('x-refresh-token') refreshTokenHeader: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Req() request: AdminProxyRequest,
    @Res({ passthrough: true }) response: AuthCookieResponse,
  ): Promise<unknown> {
    const proxyUrl = createAdminProxyUrl(request);
    const result = await this.protectedProxyService.forward({
      target: 'admin',
      authorizationHeader: getAdminAuthorizationHeaderFromRequest(
        authorizationHeader,
        cookieHeader,
      ),
      refreshToken: getAdminRefreshTokenFromRequest(
        refreshTokenHeader,
        cookieHeader,
      ),
      method: request.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      path: proxyUrl.pathname,
      query: createProxyQuery(proxyUrl.searchParams),
      body: shouldForwardBody(request.method) ? request.body : undefined,
    });

    writeProxyResponse(
      response,
      result,
      getAdminRememberMeFromCookie(cookieHeader) ?? false,
    );

    return result.body;
  }
}
