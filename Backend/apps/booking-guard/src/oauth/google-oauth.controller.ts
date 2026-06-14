import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  GoogleOAuthSessionService,
  OAuthRedirectResponse,
} from './google-oauth-session.service';
import { GoogleOAuthCallbackGuard } from './guards/google-oauth-callback.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import type { OAuthAuthenticatedRequest } from './oauth.types';

@ApiTags('guard-oauth')
@Controller('auth/google')
export class GoogleOAuthController {
  constructor(
    private readonly googleOAuthSessionService: GoogleOAuthSessionService,
  ) {}

  @ApiOperation({ summary: 'Redirect to Google OAuth login' })
  @UseGuards(GoogleOAuthGuard)
  @Get()
  redirectToGoogle(): void {
    return;
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
}
