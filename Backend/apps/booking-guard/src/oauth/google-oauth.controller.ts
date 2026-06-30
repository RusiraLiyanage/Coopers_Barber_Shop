import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  GoogleLinkResponse,
  GoogleOAuthSessionService,
  OAuthRedirectResponse,
} from './google-oauth-session.service';
import { GoogleOAuthCallbackGuard } from './guards/google-oauth-callback.guard';
import { GuardConfigService } from '@coopers/common';
import { getConfiguredGoogleOAuth } from './oauth-config.util';
import {
  createOAuthState,
  setGoogleOAuthStateCookie,
} from './oauth-state-cookie.util';
import type { OAuthAuthenticatedRequest } from './oauth.types';

type GoogleLinkRequestBody = {
  password?: string;
  endExistingSessions?: boolean;
};

@ApiTags('guard-oauth')
@Controller('auth/google')
export class GoogleOAuthController {
  constructor(
    private readonly googleOAuthSessionService: GoogleOAuthSessionService,
    private readonly guardConfig: GuardConfigService,
  ) {}

  @ApiOperation({ summary: 'Redirect to Google OAuth login' })
  @Get()
  redirectToGoogle(@Res() response: OAuthRedirectResponse): void {
    const googleConfig = getConfiguredGoogleOAuth(this.guardConfig);
    const state = createOAuthState();
    const authorizationUrl = new URL(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );

    setGoogleOAuthStateCookie(response, state);

    authorizationUrl.searchParams.set('access_type', 'online');
    authorizationUrl.searchParams.set('prompt', 'select_account');
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('redirect_uri', googleConfig.callbackUrl);
    authorizationUrl.searchParams.set('scope', googleConfig.scope.join(' '));
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('client_id', googleConfig.clientId);

    response.redirect(authorizationUrl.toString());
  }

  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @UseGuards(GoogleOAuthCallbackGuard)
  @Get('callback')
  async handleGoogleCallback(
    @Req() request: OAuthAuthenticatedRequest,
    @Res() response: OAuthRedirectResponse,
  ): Promise<void> {
    await this.googleOAuthSessionService.completeGoogleLogin(
      request.user,
      response,
    );
  }

  @ApiOperation({
    summary: 'Confirm password to link Google to an existing account',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['password'],
      properties: {
        password: { type: 'string', example: 'password123' },
      },
    },
  })
  @Post('link')
  linkGoogleAccount(
    @Body() body: GoogleLinkRequestBody,
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: GoogleLinkResponse,
  ): Promise<unknown> {
    return this.googleOAuthSessionService.linkGoogleAccount(
      body?.password,
      body?.endExistingSessions,
      cookieHeader,
      response,
    );
  }

  @ApiOperation({
    summary: 'Confirm ending active sessions before Google OAuth login',
  })
  @Post('session-switch')
  completeGoogleSessionSwitch(
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: GoogleLinkResponse,
  ): Promise<unknown> {
    return this.googleOAuthSessionService.completeGoogleSessionSwitch(
      cookieHeader,
      response,
    );
  }
}
