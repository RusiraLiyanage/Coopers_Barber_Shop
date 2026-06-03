import type { AuthTokensResponse } from '@coopers/common';

export const ACCESS_TOKEN_COOKIE = 'tsa';
export const REFRESH_TOKEN_COOKIE = 'tsr';

const LEGACY_ACCESS_TOKEN_COOKIE = 'access_token';
const LEGACY_REFRESH_TOKEN_COOKIE = 'refresh_token';
const ACCESS_TOKEN_MAX_AGE_MS = 1000 * 60 * 15;
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
): void {
  response.cookie(
    ACCESS_TOKEN_COOKIE,
    tokens.access_token,
    createCookieOptions(ACCESS_TOKEN_MAX_AGE_MS),
  );
  response.cookie(
    REFRESH_TOKEN_COOKIE,
    tokens.refresh_token,
    createCookieOptions(getRefreshTokenMaxAgeMs()),
  );
}

export function clearAuthCookies(response: AuthCookieResponse): void {
  [
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    LEGACY_ACCESS_TOKEN_COOKIE,
    LEGACY_REFRESH_TOKEN_COOKIE,
  ].forEach((cookieName) => {
    response.clearCookie(cookieName, createCookieOptions());
  });
}
