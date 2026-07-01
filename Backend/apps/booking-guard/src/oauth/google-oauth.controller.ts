import {
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  GoogleLinkResponse,
  GoogleOAuthSessionService,
  OAuthRedirectResponse,
} from './google-oauth-session.service';
import { GuardConfigService, GoogleOAuthConfig } from '@coopers/common';
import { clearAuthCookies } from '../proxy/auth-cookie.util';
import { getConfiguredGoogleOAuth } from './oauth-config.util';
import {
  clearGoogleOAuthLinkCookie,
  clearGoogleOAuthStateCookie,
  createOAuthState,
  isValidGoogleOAuthState,
  setGoogleOAuthStateCookie,
} from './oauth-state-cookie.util';
import type { NormalizedOAuthProfile } from './oauth.types';

type GoogleLinkRequestBody = {
  password?: string;
  endExistingSessions?: boolean;
};

type GoogleCallbackQuery = {
  code?: string;
  state?: string;
  error?: string;
};

type GoogleTokenResponse = {
  access_token?: unknown;
  token_type?: unknown;
  expires_in?: unknown;
  id_token?: unknown;
};

type GoogleUserInfoResponse = {
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  given_name?: unknown;
  family_name?: unknown;
};

const DEFAULT_GOOGLE_OAUTH_TIMEOUT_MS = 8_000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getGoogleOAuthTimeoutMs(): number {
  const configuredValue = Number.parseInt(
    process.env.GOOGLE_OAUTH_TIMEOUT_MS ?? '',
    10,
  );

  return Number.isFinite(configuredValue) && configuredValue > 0
    ? configuredValue
    : DEFAULT_GOOGLE_OAUTH_TIMEOUT_MS;
}

async function fetchJsonWithTimeout<TResponse>(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<TResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Google OAuth request failed with ${response.status}`);
    }

    return (await response.json()) as TResponse;
  } finally {
    clearTimeout(timeout);
  }
}

async function exchangeGoogleCodeForAccessToken(
  code: string,
  googleConfig: GoogleOAuthConfig,
): Promise<string> {
  const body = new URLSearchParams({
    code,
    client_id: googleConfig.clientId,
    client_secret: googleConfig.clientSecret,
    redirect_uri: googleConfig.callbackUrl,
    grant_type: 'authorization_code',
  });

  const tokenResponse = await fetchJsonWithTimeout<GoogleTokenResponse>(
    'https://oauth2.googleapis.com/token',
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
    },
    getGoogleOAuthTimeoutMs(),
  );

  if (typeof tokenResponse.access_token !== 'string') {
    throw new Error('Google OAuth token response did not include access_token.');
  }

  return tokenResponse.access_token;
}

async function fetchGoogleUserProfile(
  accessToken: string,
): Promise<NormalizedOAuthProfile> {
  const profile = await fetchJsonWithTimeout<GoogleUserInfoResponse>(
    'https://www.googleapis.com/oauth2/v3/userinfo',
    {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
    },
    getGoogleOAuthTimeoutMs(),
  );

  if (typeof profile.sub !== 'string' || typeof profile.email !== 'string') {
    throw new Error('Google profile is missing required identity information.');
  }

  if (profile.email_verified !== true) {
    throw new Error('Google email address is not verified.');
  }

  return {
    provider: 'google',
    providerUserId: profile.sub,
    email: normalizeEmail(profile.email),
    emailVerified: true,
    firstName:
      typeof profile.given_name === 'string' ? profile.given_name : undefined,
    lastName:
      typeof profile.family_name === 'string'
        ? profile.family_name
        : undefined,
  };
}

function clearOAuthCookies(response: OAuthRedirectResponse): void {
  clearGoogleOAuthStateCookie(response);
  clearGoogleOAuthLinkCookie(response);
  clearAuthCookies(response);
}

@ApiTags('guard-oauth')
@Controller('auth/google')
export class GoogleOAuthController {
  private readonly logger = new Logger(GoogleOAuthController.name);

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
  @Get('callback')
  async handleGoogleCallback(
    @Query() query: GoogleCallbackQuery,
    @Headers('cookie') cookieHeader: string | undefined,
    @Res() response: OAuthRedirectResponse,
  ): Promise<void> {
    const googleConfig = getConfiguredGoogleOAuth(this.guardConfig);
    const code = query.code?.trim();
    const state = query.state?.trim();

    if (
      query.error ||
      !code ||
      !isValidGoogleOAuthState(cookieHeader, state)
    ) {
      clearOAuthCookies(response);
      response.redirect(googleConfig.failureRedirectUrl);
      return;
    }

    try {
      const accessToken = await exchangeGoogleCodeForAccessToken(
        code,
        googleConfig,
      );
      const profile = await fetchGoogleUserProfile(accessToken);

      clearGoogleOAuthStateCookie(response);
      await this.googleOAuthSessionService.completeGoogleLogin(
        profile,
        response,
      );
    } catch (error) {
      this.logger.warn(
        'Google OAuth callback failed.',
        error instanceof Error ? error.stack : undefined,
      );
      clearOAuthCookies(response);
      response.redirect(googleConfig.failureRedirectUrl);
    }
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
