import { Body, Controller, Get, Headers, Patch, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ProtectedProxyResponse,
  ProtectedProxyService,
} from './protected-proxy.service';
import {
  AuthCookieResponse,
  getAuthorizationHeaderFromRequest,
  getRememberMeFromCookie,
  setAuthCookies,
} from './auth-cookie.util';
import { getRefreshTokenFromRequest } from './refresh-token.util';

type UpdateAccountRequestBody = {
  email: string;
  firstName: string;
  lastName: string;
  mobile: string;
  suburb: string;
};

function writeProxyResponse(
  response: AuthCookieResponse,
  result: ProtectedProxyResponse,
  rememberMe: boolean,
): void {
  response.status(result.statusCode);

  if (result.refreshedTokens) {
    setAuthCookies(response, result.refreshedTokens, { rememberMe });
  }
}

@ApiTags('guard-account-proxy')
@ApiBearerAuth('access-token')
@Controller('auth')
export class AccountProxyController {
  constructor(private readonly protectedProxyService: ProtectedProxyService) {}

  @ApiOperation({ summary: 'Proxy current account profile to auth-api' })
  @Get('me')
  async getAccountProfile(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Headers('x-refresh-token') refreshTokenHeader: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: AuthCookieResponse,
  ): Promise<unknown> {
    const result = await this.protectedProxyService.forward({
      target: 'auth',
      authorizationHeader: getAuthorizationHeaderFromRequest(
        authorizationHeader,
        cookieHeader,
      ),
      refreshToken: getRefreshTokenFromRequest(
        refreshTokenHeader,
        cookieHeader,
      ),
      method: 'GET',
      path: '/auth/me',
    });

    writeProxyResponse(
      response,
      result,
      getRememberMeFromCookie(cookieHeader) ?? true,
    );

    return result.body;
  }

  @ApiOperation({ summary: 'Proxy current account update to auth-api' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'firstName', 'lastName', 'mobile', 'suburb'],
      properties: {
        email: { type: 'string', example: 'customer@example.com' },
        firstName: { type: 'string', example: 'Cooper' },
        lastName: { type: 'string', example: 'Smith' },
        mobile: { type: 'string', example: '+61412345678' },
        suburb: { type: 'string', example: 'Surry Hills' },
      },
    },
  })
  @Patch('me')
  async updateAccountProfile(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Headers('x-refresh-token') refreshTokenHeader: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Body() body: UpdateAccountRequestBody,
    @Res({ passthrough: true }) response: AuthCookieResponse,
  ): Promise<unknown> {
    const result = await this.protectedProxyService.forward({
      target: 'auth',
      authorizationHeader: getAuthorizationHeaderFromRequest(
        authorizationHeader,
        cookieHeader,
      ),
      refreshToken: getRefreshTokenFromRequest(
        refreshTokenHeader,
        cookieHeader,
      ),
      method: 'PATCH',
      path: '/auth/me',
      body,
    });

    writeProxyResponse(
      response,
      result,
      getRememberMeFromCookie(cookieHeader) ?? true,
    );

    return result.body;
  }
}
