import {
  getAdminRefreshTokenFromCookie,
  getRefreshTokenFromCookie,
} from './auth-cookie.util';

type RefreshTokenRequestBody = {
  refresh_token?: string;
};

function getUsableToken(token: string | undefined): string | undefined {
  const trimmedToken = token?.trim();

  return trimmedToken ? trimmedToken : undefined;
}

export function getRefreshTokenFromRequest(
  refreshTokenHeader: string | undefined,
  cookieHeader: string | undefined,
  body?: RefreshTokenRequestBody,
): string | undefined {
  return getRefreshTokenFromRequestCookie(
    refreshTokenHeader,
    cookieHeader,
    getRefreshTokenFromCookie,
    body,
  );
}

export function getAdminRefreshTokenFromRequest(
  refreshTokenHeader: string | undefined,
  cookieHeader: string | undefined,
  body?: RefreshTokenRequestBody,
): string | undefined {
  return getRefreshTokenFromRequestCookie(
    refreshTokenHeader,
    cookieHeader,
    getAdminRefreshTokenFromCookie,
    body,
  );
}

function getRefreshTokenFromRequestCookie(
  refreshTokenHeader: string | undefined,
  cookieHeader: string | undefined,
  getCookieRefreshToken: (
    cookieHeader: string | undefined,
  ) => string | undefined,
  body?: RefreshTokenRequestBody,
): string | undefined {
  return (
    getUsableToken(refreshTokenHeader) ??
    getUsableToken(body?.refresh_token) ??
    getCookieRefreshToken(cookieHeader)
  );
}

export function createRefreshTokenBody(
  refreshTokenHeader: string | undefined,
  cookieHeader: string | undefined,
  body: RefreshTokenRequestBody,
): RefreshTokenRequestBody {
  const refreshToken = getRefreshTokenFromRequest(
    refreshTokenHeader,
    cookieHeader,
    body,
  );

  return refreshToken ? { refresh_token: refreshToken } : body;
}

export function createAdminRefreshTokenBody(
  refreshTokenHeader: string | undefined,
  cookieHeader: string | undefined,
  body: RefreshTokenRequestBody,
): RefreshTokenRequestBody {
  const refreshToken = getAdminRefreshTokenFromRequest(
    refreshTokenHeader,
    cookieHeader,
    body,
  );

  return refreshToken ? { refresh_token: refreshToken } : body;
}
