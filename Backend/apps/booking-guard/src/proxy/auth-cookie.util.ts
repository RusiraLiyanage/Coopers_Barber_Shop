import { getRequiredEnvInteger } from '@coopers/common';
import type { AuthTokensResponse } from '@coopers/common';

export const ACCESS_TOKEN_COOKIE = 'tsa';
export const REFRESH_TOKEN_COOKIE = 'tsr';
export const REMEMBER_ME_COOKIE = 'tsm';
export const ADMIN_ACCESS_TOKEN_COOKIE = 'admin_tsa';
export const ADMIN_REFRESH_TOKEN_COOKIE = 'admin_tsr';
export const ADMIN_REMEMBER_ME_COOKIE = 'admin_tsm';

const LEGACY_ACCESS_TOKEN_COOKIE = 'access_token';
const LEGACY_REFRESH_TOKEN_COOKIE = 'refresh_token';

type AuthCookieNames = {
  accessToken: string;
  refreshToken: string;
  rememberMe: string;
  legacyAccessToken?: string;
  legacyRefreshToken?: string;
};

const CUSTOMER_AUTH_COOKIES: AuthCookieNames = {
  accessToken: ACCESS_TOKEN_COOKIE,
  refreshToken: REFRESH_TOKEN_COOKIE,
  rememberMe: REMEMBER_ME_COOKIE,
  legacyAccessToken: LEGACY_ACCESS_TOKEN_COOKIE,
  legacyRefreshToken: LEGACY_REFRESH_TOKEN_COOKIE,
};

const ADMIN_AUTH_COOKIES: AuthCookieNames = {
  accessToken: ADMIN_ACCESS_TOKEN_COOKIE,
  refreshToken: ADMIN_REFRESH_TOKEN_COOKIE,
  rememberMe: ADMIN_REMEMBER_ME_COOKIE,
};

type AuthCookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge?: number;
  domain?: string;
};

export type AuthCookieResponse = {
  status: (statusCode: number) => void;
  cookie: (name: string, value: string, options: AuthCookieOptions) => void;
  clearCookie: (name: string, options: AuthCookieOptions) => void;
  setHeader?: (name: string, value: string) => void;
};

type SetAuthCookieOptions = {
  rememberMe?: boolean;
};

function getRefreshTokenMaxAgeMs(): number {
  return getRequiredEnvInteger('REFRESH_TOKEN_TTL_DAYS') * 24 * 60 * 60 * 1000;
}

function getAccessTokenMaxAgeMs(): number {
  return getRequiredEnvInteger('ACCESS_TOKEN_TTL_SECONDS') * 1000;
}

function createCookieOptions(maxAge?: number): AuthCookieOptions {
  const domain = process.env.COOKIE_DOMAIN?.trim();

  return {
    httpOnly: true,
    secure: process.env.ENV !== 'develop',
    sameSite: 'lax',
    path: '/',
    ...(maxAge ? { maxAge } : {}),
    ...(domain ? { domain } : {}),
  };
}

function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getCookieValue(
  cookieHeader: string | undefined,
  cookieName: string,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  const cookie = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${cookieName}=`));

  if (!cookie) {
    return undefined;
  }

  const [, ...valueParts] = cookie.split('=');
  const value = decodeCookieValue(valueParts.join('=')).trim();

  return value.length > 0 ? value : undefined;
}

export function getAccessTokenFromCookie(
  cookieHeader: string | undefined,
): string | undefined {
  return getAccessTokenFromCookieNames(cookieHeader, CUSTOMER_AUTH_COOKIES);
}

export function getRefreshTokenFromCookie(
  cookieHeader: string | undefined,
): string | undefined {
  return getRefreshTokenFromCookieNames(cookieHeader, CUSTOMER_AUTH_COOKIES);
}

export function getRememberMeFromCookie(
  cookieHeader: string | undefined,
): boolean | undefined {
  return getRememberMeFromCookieNames(cookieHeader, CUSTOMER_AUTH_COOKIES);
}

export function getAdminAccessTokenFromCookie(
  cookieHeader: string | undefined,
): string | undefined {
  return getAccessTokenFromCookieNames(cookieHeader, ADMIN_AUTH_COOKIES);
}

export function getAdminRefreshTokenFromCookie(
  cookieHeader: string | undefined,
): string | undefined {
  return getRefreshTokenFromCookieNames(cookieHeader, ADMIN_AUTH_COOKIES);
}

export function getAdminRememberMeFromCookie(
  cookieHeader: string | undefined,
): boolean | undefined {
  return getRememberMeFromCookieNames(cookieHeader, ADMIN_AUTH_COOKIES);
}

function getAccessTokenFromCookieNames(
  cookieHeader: string | undefined,
  cookieNames: AuthCookieNames,
): string | undefined {
  return (
    getCookieValue(cookieHeader, cookieNames.accessToken) ??
    (cookieNames.legacyAccessToken
      ? getCookieValue(cookieHeader, cookieNames.legacyAccessToken)
      : undefined)
  );
}

function getRefreshTokenFromCookieNames(
  cookieHeader: string | undefined,
  cookieNames: AuthCookieNames,
): string | undefined {
  return (
    getCookieValue(cookieHeader, cookieNames.refreshToken) ??
    (cookieNames.legacyRefreshToken
      ? getCookieValue(cookieHeader, cookieNames.legacyRefreshToken)
      : undefined)
  );
}

function getRememberMeFromCookieNames(
  cookieHeader: string | undefined,
  cookieNames: AuthCookieNames,
): boolean | undefined {
  const rememberMe = getCookieValue(cookieHeader, cookieNames.rememberMe);

  if (rememberMe === undefined) {
    return undefined;
  }

  return rememberMe === 'true';
}

export function getAuthorizationHeaderFromRequest(
  authorizationHeader: string | undefined,
  cookieHeader: string | undefined,
): string | undefined {
  return getAuthorizationHeaderFromRequestCookies(
    authorizationHeader,
    getAccessTokenFromCookie(cookieHeader),
  );
}

export function getAdminAuthorizationHeaderFromRequest(
  authorizationHeader: string | undefined,
  cookieHeader: string | undefined,
): string | undefined {
  return getAuthorizationHeaderFromRequestCookies(
    authorizationHeader,
    getAdminAccessTokenFromCookie(cookieHeader),
  );
}

function getAuthorizationHeaderFromRequestCookies(
  authorizationHeader: string | undefined,
  accessToken: string | undefined,
): string | undefined {
  if (authorizationHeader?.trim()) {
    return authorizationHeader;
  }

  return accessToken ? `Bearer ${accessToken}` : undefined;
}

export function setAuthCookies(
  response: AuthCookieResponse,
  tokens: AuthTokensResponse,
  options: SetAuthCookieOptions = {},
): void {
  setScopedAuthCookies(response, tokens, CUSTOMER_AUTH_COOKIES, options);
}

export function setAdminAuthCookies(
  response: AuthCookieResponse,
  tokens: AuthTokensResponse,
  options: SetAuthCookieOptions = {},
): void {
  setScopedAuthCookies(response, tokens, ADMIN_AUTH_COOKIES, options);
}

function setScopedAuthCookies(
  response: AuthCookieResponse,
  tokens: AuthTokensResponse,
  cookieNames: AuthCookieNames,
  options: SetAuthCookieOptions = {},
): void {
  const rememberMe = options.rememberMe === true;
  const accessTokenMaxAge = rememberMe ? getAccessTokenMaxAgeMs() : undefined;
  const refreshTokenMaxAge = rememberMe ? getRefreshTokenMaxAgeMs() : undefined;

  response.cookie(
    cookieNames.accessToken,
    tokens.access_token,
    createCookieOptions(accessTokenMaxAge),
  );
  response.cookie(
    cookieNames.refreshToken,
    tokens.refresh_token,
    createCookieOptions(refreshTokenMaxAge),
  );
  response.cookie(
    cookieNames.rememberMe,
    rememberMe ? 'true' : 'false',
    createCookieOptions(refreshTokenMaxAge),
  );
}

export function clearAuthCookies(response: AuthCookieResponse): void {
  clearScopedAuthCookies(response, CUSTOMER_AUTH_COOKIES);
}

export function clearAdminAuthCookies(response: AuthCookieResponse): void {
  clearScopedAuthCookies(response, ADMIN_AUTH_COOKIES);
}

function clearScopedAuthCookies(
  response: AuthCookieResponse,
  cookieNames: AuthCookieNames,
): void {
  [
    cookieNames.accessToken,
    cookieNames.refreshToken,
    cookieNames.rememberMe,
    cookieNames.legacyAccessToken,
    cookieNames.legacyRefreshToken,
  ].forEach((cookieName) => {
    if (!cookieName) {
      return;
    }

    response.clearCookie(cookieName, createCookieOptions());
  });
}
