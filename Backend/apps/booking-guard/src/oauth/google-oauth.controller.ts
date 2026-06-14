import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GoogleOAuthCallbackGuard } from './guards/google-oauth-callback.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import type {
  NormalizedOAuthProfile,
  OAuthAuthenticatedRequest,
} from './oauth.types';

@ApiTags('guard-oauth')
@Controller('auth/google')
export class GoogleOAuthController {
  @ApiOperation({ summary: 'Redirect to Google OAuth login' })
  @UseGuards(GoogleOAuthGuard)
  @Get()
  redirectToGoogle(): void {
    return;
  }

  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @UseGuards(GoogleOAuthCallbackGuard)
  @Get('callback')
  handleGoogleCallback(
    @Req() request: OAuthAuthenticatedRequest,
  ): NormalizedOAuthProfile {
    return request.user;
  }
}
