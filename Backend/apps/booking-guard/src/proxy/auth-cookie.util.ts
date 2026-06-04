import type { AuthTokensResponse } from '@coopers/common';

export const ACCESS_TOKEN_COOKIE = 'tsa';
export const REFRESH_TOKEN_COOKIE = 'tsr';
export const REMEMBER_ME_COOKIE = 'tsm';

const LEGACY_ACCESS_TOKEN_COOKIE = 'access_token';
const LEGACY_REFRESH_TOKEN_COOKIE = 'refresh_token';
const ACCESS_TOKEN_MAX_AGE_MS = 1000 * 60 * 5;
const DEFAULT_REFRESH_TOKEN_TTL_DAYS = 14;

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
  const configuredTtlDays = Number(
    process.env.REFRESH_TOKEN_TTL_DAYS ?? DEFAULT_REFRESH_TOKEN_TTL_DAYS,
  );
  const ttlDays =
    Number.isFinite(configuredTtlDays) && configuredTtlDays > 0
      ? configuredTtlDays
      : DEFAULT_REFRESH_TOKEN_TTL_DAYS;

  return ttlDays * 24 * 60 * 60 * 1000;
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
  return (
    getCookieValue(cookieHeader, ACCESS_TOKEN_COOKIE) ??
    getCookieValue(cookieHeader, LEGACY_ACCESS_TOKEN_COOKIE)
  );
}

export function getRefreshTokenFromCookie(
  cookieHeader: string | undefined,
): string | undefined {
  return (
    getCookieValue(cookieHeader, REFRESH_TOKEN_COOKIE) ??
    getCookieValue(cookieHeader, LEGACY_REFRESH_TOKEN_COOKIE)
  );
}

export function getRememberMeFromCookie(
  cookieHeader: string | undefined,
): boolean | undefined {
  const rememberMe = getCookieValue(cookieHeader, REMEMBER_ME_COOKIE);

  if (rememberMe === undefined) {
    return undefined;
  }

  return rememberMe === 'true';
}

export function getAuthorizationHeaderFromRequest(
  authorizationHeader: string | undefined,
  cookieHeader: string | undefined,
): string | undefined {
  if (authorizationHeader?.trim()) {
    return authorizationHeader;
  }

  const accessToken = getAccessTokenFromCookie(cookieHeader);

  return accessToken ? `Bearer ${accessToken}` : undefined;
}

export function setAuthCookies(
  response: AuthCookieResponse,
  tokens: AuthTokensResponse,
  options: SetAuthCookieOptions = {},
): void {
  const rememberMe = options.rememberMe ?? true;
  const accessTokenMaxAge = rememberMe ? ACCESS_TOKEN_MAX_AGE_MS : undefined;
  const refreshTokenMaxAge = rememberMe ? getRefreshTokenMaxAgeMs() : undefined;

  response.cookie(
    ACCESS_TOKEN_COOKIE,
    tokens.access_token,
    createCookieOptions(accessTokenMaxAge),
  );
  response.cookie(
    REFRESH_TOKEN_COOKIE,
    tokens.refresh_token,
    createCookieOptions(refreshTokenMaxAge),
  );
  response.cookie(
    REMEMBER_ME_COOKIE,
    rememberMe ? 'true' : 'false',
    createCookieOptions(refreshTokenMaxAge),
  );
}

export function clearAuthCookies(response: AuthCookieResponse): void {
  [
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    REMEMBER_ME_COOKIE,
    LEGACY_ACCESS_TOKEN_COOKIE,
    LEGACY_REFRESH_TOKEN_COOKIE,
  ].forEach((cookieName) => {
    response.clearCookie(cookieName, createCookieOptions());
  });
}
