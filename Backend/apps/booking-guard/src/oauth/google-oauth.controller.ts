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
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import type { OAuthAuthenticatedRequest } from './oauth.types';

type GoogleLinkRequestBody = {
  password?: string;
};

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
      cookieHeader,
      response,
    );
  }
}
