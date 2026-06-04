export const GENERIC_ERROR_MESSAGE =
  "An error occurred. Please try again later.";

export function logDevelopmentError(context: string, error: unknown): void {
  if (!import.meta.env.DEV) {
    return;
  }

  console.error(`[${context}]`, error);
}

export function getGenericErrorMessage(
  context: string,
  error: unknown,
): string {
  logDevelopmentError(context, error);

  return GENERIC_ERROR_MESSAGE;
}

export function getRawErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
