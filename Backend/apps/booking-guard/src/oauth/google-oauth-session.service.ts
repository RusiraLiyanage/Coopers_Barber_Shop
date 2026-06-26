import { Injectable } from '@nestjs/common';
import type { AuthTokensResponse } from '@coopers/common';
import { GuardConfigService, GoogleOAuthConfig } from '@coopers/common';
import {
  AuthCookieResponse,
  clearAuthCookies,
  setAuthCookies,
} from '../proxy/auth-cookie.util';
import { ProxyService } from '../proxy/proxy.service';
import {
  clearGoogleOAuthLinkCookie,
  getGoogleOAuthLinkTicket,
  setGoogleOAuthLinkCookie,
  setGoogleOAuthSessionSwitchCookie,
} from './oauth-state-cookie.util';
import type { NormalizedOAuthProfile } from './oauth.types';

export type OAuthRedirectResponse = AuthCookieResponse & {
  redirect: (url: string) => void;
};

export type GoogleLinkResponse = AuthCookieResponse;

type AuthStatusResponse = {
  authenticated: true;
};

type GoogleOAuthCompletionResult =
  | { status: 'authenticated'; tokens: AuthTokensResponse }
  | { status: 'link_required'; linkTicket: string }
  | { status: 'session_switch_required'; linkTicket: string; email: string };

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

function parseCompletionResult(
  body: unknown,
): GoogleOAuthCompletionResult | null {
  if (typeof body !== 'object' || body === null || !('status' in body)) {
    return null;
  }

  const result = body as {
    status: unknown;
    tokens?: unknown;
    linkTicket?: unknown;
    email?: unknown;
  };

  if (
    result.status === 'authenticated' &&
    isAuthTokensResponse(result.tokens)
  ) {
    return { status: 'authenticated', tokens: result.tokens };
  }

  if (
    result.status === 'link_required' &&
    typeof result.linkTicket === 'string'
  ) {
    return { status: 'link_required', linkTicket: result.linkTicket };
  }

  if (
    result.status === 'session_switch_required' &&
    typeof result.linkTicket === 'string' &&
    typeof result.email === 'string'
  ) {
    return {
      status: 'session_switch_required',
      linkTicket: result.linkTicket,
      email: result.email,
    };
  }

  return null;
}

function createGoogleOAuthCompletionBody(profile: NormalizedOAuthProfile) {
  return {
    providerUserId: profile.providerUserId,
    email: profile.email,
    emailVerified: profile.emailVerified,
    firstName: profile.firstName,
    lastName: profile.lastName,
  };
}

// Reuses the configured frontend success URL as the link prompt page, marking it
// so the SPA opens the "confirm your password to connect Google" step. The email
// is the user's own and only drives the prompt copy; the authoritative identity
// lives in the httpOnly link-ticket cookie.
function buildLinkRedirectUrl(
  googleConfig: GoogleOAuthConfig,
  email: string,
): string {
  const url = new URL(googleConfig.successRedirectUrl);

  url.searchParams.set('link_google', '1');
  url.searchParams.set('email', email);

  return url.toString();
}

function buildSessionSwitchRedirectUrl(
  googleConfig: GoogleOAuthConfig,
  email: string,
): string {
  const url = new URL(googleConfig.successRedirectUrl);

  url.searchParams.set('switch_google', '1');
  url.searchParams.set('email', email);

  return url.toString();
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

    const completion = isSuccessStatus(result.statusCode)
      ? parseCompletionResult(result.body)
      : null;

    if (completion?.status === 'authenticated') {
      setAuthCookies(response, completion.tokens, { rememberMe: true });
      response.redirect(googleConfig.successRedirectUrl);
      return;
    }

    if (completion?.status === 'link_required') {
      setGoogleOAuthLinkCookie(response, completion.linkTicket);
      response.redirect(buildLinkRedirectUrl(googleConfig, profile.email));
      return;
    }

    if (completion?.status === 'session_switch_required') {
      setGoogleOAuthSessionSwitchCookie(response, completion.linkTicket);
      response.redirect(
        buildSessionSwitchRedirectUrl(googleConfig, completion.email),
      );
      return;
    }

    clearAuthCookies(response);
    clearGoogleOAuthLinkCookie(response);
    response.redirect(googleConfig.failureRedirectUrl);
  }

  async linkGoogleAccount(
    password: string | undefined,
    endExistingSessions: boolean | undefined,
    cookieHeader: string | undefined,
    response: GoogleLinkResponse,
  ): Promise<unknown> {
    const linkTicket = getGoogleOAuthLinkTicket(cookieHeader);

    if (!linkTicket || !password) {
      clearGoogleOAuthLinkCookie(response);
      response.status(400);

      return { message: 'Google link request is missing or has expired.' };
    }

    const result = await this.proxyService.forward({
      target: 'auth',
      method: 'POST',
      path: '/auth/oauth/google/link',
      body: { linkTicket, password, endExistingSessions },
    });

    response.status(result.statusCode);

    if (
      isSuccessStatus(result.statusCode) &&
      isAuthTokensResponse(result.body)
    ) {
      setAuthCookies(response, result.body, { rememberMe: true });
      clearGoogleOAuthLinkCookie(response);

      return { authenticated: true } satisfies AuthStatusResponse;
    }

    // Keep the ticket cookie on a wrong password (401) so the user can retry;
    // drop it on any other failure since the ticket is no longer usable.
    if (result.statusCode !== 401) {
      clearGoogleOAuthLinkCookie(response);
    }

    return result.body;
  }

  async completeGoogleSessionSwitch(
    cookieHeader: string | undefined,
    response: GoogleLinkResponse,
  ): Promise<unknown> {
    const linkTicket = getGoogleOAuthLinkTicket(cookieHeader);

    if (!linkTicket) {
      clearGoogleOAuthLinkCookie(response);
      response.status(400);

      return {
        message: 'Google session switch request is missing or expired.',
      };
    }

    const result = await this.proxyService.forward({
      target: 'auth',
      method: 'POST',
      path: '/auth/oauth/google/session-switch',
      body: { linkTicket },
    });

    response.status(result.statusCode);

    if (
      isSuccessStatus(result.statusCode) &&
      isAuthTokensResponse(result.body)
    ) {
      setAuthCookies(response, result.body, { rememberMe: true });
      clearGoogleOAuthLinkCookie(response);

      return { authenticated: true } satisfies AuthStatusResponse;
    }

    clearGoogleOAuthLinkCookie(response);

    return result.body;
  }
}
