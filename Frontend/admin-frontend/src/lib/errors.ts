import { ApiRequestError } from './api';

const USER_FRIENDLY_FALLBACK = 'Something went wrong. Please try again later.';

export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return 'You do not have permission to access this admin area.';
    }

    if (error.statusCode >= 400 && error.statusCode < 500) {
      return error.message;
    }
  }

  return USER_FRIENDLY_FALLBACK;
}
