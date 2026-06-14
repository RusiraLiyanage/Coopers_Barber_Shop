import { Injectable } from '@nestjs/common';
import type { AuthTokensResponse } from '@coopers/common';
import { GuardConfigService } from '@coopers/common';
import {
  AuthCookieResponse,
  clearAuthCookies,
  setAuthCookies,
} from '../proxy/auth-cookie.util';
import { ProxyService } from '../proxy/proxy.service';
import type { NormalizedOAuthProfile } from './oauth.types';

export type OAuthRedirectResponse = AuthCookieResponse & {
  redirect: (url: string) => void;
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

function isSuccessStatus(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}

function createGoogleOAuthCompletionBody(profile: NormalizedOAuthProfile) {
  return {
    providerUserId: profile.providerUserId,
    email: profile.email,
    emailVerified: profile.emailVerified,
    firstName: profile.firstName,
    lastName: profile.lastName,
    displayName: profile.displayName,
    picture: profile.picture,
  };
}

@Injectable()
export class GoogleOAuthSessionService {
  constructor(
    private readonly guardConfig: GuardConfigService,
    private readonly proxyService: ProxyService,
  ) {}

  async completeGoogleLogin(
    profile: NormalizedOAuthProfile,
    response: OAuthRedirectResponse,
  ): Promise<void> {
    const googleConfig = this.guardConfig.getGoogleOAuthConfig();
    const result = await this.proxyService.forward({
      target: 'auth',
      method: 'POST',
      path: '/auth/oauth/google/complete',
      body: createGoogleOAuthCompletionBody(profile),
    });

    if (
      isSuccessStatus(result.statusCode) &&
      isAuthTokensResponse(result.body)
    ) {
      setAuthCookies(response, result.body, { rememberMe: true });
      response.redirect(googleConfig.successRedirectUrl);
      return;
    }

    clearAuthCookies(response);
    response.redirect(googleConfig.failureRedirectUrl);
  }
}
