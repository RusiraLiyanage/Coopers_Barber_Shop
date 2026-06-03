type RefreshTokenRequestBody = {
  refresh_token?: string;
};

function getUsableToken(token: string | undefined): string | undefined {
  const trimmedToken = token?.trim();

  return trimmedToken ? trimmedToken : undefined;
}

function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getRefreshTokenFromCookie(
  cookieHeader: string | undefined,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  const refreshTokenCookie = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('refresh_token='));

  if (!refreshTokenCookie) {
    return undefined;
  }

  const [, ...valueParts] = refreshTokenCookie.split('=');
  const encodedValue = valueParts.join('=');

  return getUsableToken(decodeCookieValue(encodedValue));
}

export function getRefreshTokenFromRequest(
  refreshTokenHeader: string | undefined,
  cookieHeader: string | undefined,
  body?: RefreshTokenRequestBody,
): string | undefined {
  return (
    getUsableToken(refreshTokenHeader) ??
    getUsableToken(body?.refresh_token) ??
    getRefreshTokenFromCookie(cookieHeader)
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
