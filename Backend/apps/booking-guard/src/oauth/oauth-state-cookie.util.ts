import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { getCookieValue } from '../proxy/auth-cookie.util';

const GOOGLE_OAUTH_STATE_COOKIE = 'gos';
const GOOGLE_OAUTH_LINK_COOKIE = 'gol';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const OAUTH_LINK_TTL_MS = 10 * 60 * 1000;
const GOOGLE_CALLBACK_PATH = '/auth/google/callback';
const GOOGLE_LINK_PATH = '/auth/google/link';
const GOOGLE_SESSION_SWITCH_PATH = '/auth/google/session-switch';

type OAuthCookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge?: number;
  domain?: string;
};

export type OAuthStateCookieResponse = {
  cookie: (name: string, value: string, options: OAuthCookieOptions) => void;
  clearCookie: (name: string, options: OAuthCookieOptions) => void;
};

type OAuthStateRequestQuery = Record<string, unknown> | undefined;

function createCookieOptions(
  path: string,
  maxAge?: number,
): OAuthCookieOptions {
  const domain = process.env.COOKIE_DOMAIN?.trim();

  return {
    httpOnly: true,
    secure: process.env.ENV !== 'develop',
    sameSite: 'lax',
    path,
    ...(maxAge ? { maxAge } : {}),
    ...(domain ? { domain } : {}),
  };
}

function hashState(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

function statesMatch(providedState: string, expectedState: string): boolean {
  return timingSafeEqual(hashState(providedState), hashState(expectedState));
}

export function createOAuthState(): string {
  return randomBytes(32).toString('base64url');
}

export function setGoogleOAuthStateCookie(
  response: OAuthStateCookieResponse,
  state: string,
): void {
  response.cookie(
    GOOGLE_OAUTH_STATE_COOKIE,
    state,
    createCookieOptions(GOOGLE_CALLBACK_PATH, OAUTH_STATE_TTL_MS),
  );
}

export function clearGoogleOAuthStateCookie(
  response: OAuthStateCookieResponse,
): void {
  response.clearCookie(
    GOOGLE_OAUTH_STATE_COOKIE,
    createCookieOptions(GOOGLE_CALLBACK_PATH),
  );
}

export function setGoogleOAuthLinkCookie(
  response: OAuthStateCookieResponse,
  linkTicket: string,
): void {
  response.cookie(
    GOOGLE_OAUTH_LINK_COOKIE,
    linkTicket,
    createCookieOptions(GOOGLE_LINK_PATH, OAUTH_LINK_TTL_MS),
  );
}

export function setGoogleOAuthSessionSwitchCookie(
  response: OAuthStateCookieResponse,
  linkTicket: string,
): void {
  response.cookie(
    GOOGLE_OAUTH_LINK_COOKIE,
    linkTicket,
    createCookieOptions(GOOGLE_SESSION_SWITCH_PATH, OAUTH_LINK_TTL_MS),
  );
}

export function clearGoogleOAuthLinkCookie(
  response: OAuthStateCookieResponse,
): void {
  response.clearCookie(
    GOOGLE_OAUTH_LINK_COOKIE,
    createCookieOptions(GOOGLE_LINK_PATH),
  );
  response.clearCookie(
    GOOGLE_OAUTH_LINK_COOKIE,
    createCookieOptions(GOOGLE_SESSION_SWITCH_PATH),
  );
}

export function getGoogleOAuthLinkTicket(
  cookieHeader: string | undefined,
): string | undefined {
  return getCookieValue(cookieHeader, GOOGLE_OAUTH_LINK_COOKIE);
}

export function getOAuthStateFromQuery(
  query: OAuthStateRequestQuery,
): string | undefined {
  const state = query?.state;

  return typeof state === 'string' && state.trim().length > 0
    ? state.trim()
    : undefined;
}

export function isValidGoogleOAuthState(
  cookieHeader: string | undefined,
  providedState: string | undefined,
): boolean {
  if (!providedState) {
    return false;
  }

  const expectedState = getCookieValue(cookieHeader, GOOGLE_OAUTH_STATE_COOKIE);

  return expectedState ? statesMatch(providedState, expectedState) : false;
}
