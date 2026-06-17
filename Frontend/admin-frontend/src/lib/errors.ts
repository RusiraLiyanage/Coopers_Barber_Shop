import { ApiRequestError, isSessionExpiryCode } from './api';

const USER_FRIENDLY_FALLBACK = 'Something went wrong. Please try again later.';
export const ADMIN_SESSION_EXPIRED_MESSAGE =
  'Session expired. Please login again.';

export function isSessionExpiredError(error: unknown): boolean {
  return (
    error instanceof ApiRequestError && isSessionExpiryCode(error.code)
  );
}

export function getUserFriendlyErrorMessage(error: unknown): string {
  if (isSessionExpiredError(error)) {
    return ADMIN_SESSION_EXPIRED_MESSAGE;
  }

  if (error instanceof ApiRequestError) {
    if (
      error.statusCode === 401 &&
      error.message.toLowerCase().includes('invalid email or password')
    ) {
      return 'Invalid email or password.';
    }

    if (error.statusCode === 401 || error.statusCode === 403) {
      return 'You do not have permission to access this admin area.';
    }

    if (error.statusCode >= 400 && error.statusCode < 500) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message === 'Admin access required.') {
    return error.message;
  }

  return USER_FRIENDLY_FALLBACK;
}
