import { Injectable, NestMiddleware } from '@nestjs/common';

type MutableRecord = Record<string, unknown>;

// This Middleware protects the backend from malicious user's inputs (XSS)

export type XssProtectionRequest = {
  body?: unknown;
  query?: unknown;
  params?: unknown;
};

type SanitizableRequestProperty = 'body' | 'query' | 'params';

const SENSITIVE_FIELD_NAMES = new Set([
  'password',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'jwt',
  'secret',
  'clientsecret',
  'otp',
  'code',
]);

const HTML_ESCAPE_MAP: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '`': '&#96;',
};

function normalizeFieldName(fieldName: string): string {
  return fieldName.replace(/[-_]/g, '').toLowerCase();
}

function shouldSkipValue(fieldName?: string): boolean {
  return fieldName
    ? SENSITIVE_FIELD_NAMES.has(normalizeFieldName(fieldName))
    : false;
}

function isSanitizableRecord(value: unknown): value is MutableRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function sanitizeXssString(value: string): string {
  return value
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(/[<>`]/g, (character) => HTML_ESCAPE_MAP[character] ?? character);
}

export function sanitizeXssValue(
  value: unknown,
  fieldName?: string,
  seen = new WeakSet<object>(),
): unknown {
  if (shouldSkipValue(fieldName)) {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizeXssString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeXssValue(item, fieldName, seen));
  }

  if (!isSanitizableRecord(value)) {
    return value;
  }

  if (seen.has(value)) {
    return value;
  }

  seen.add(value);

  for (const key of Object.keys(value)) {
    const sanitizedKey = sanitizeXssString(key);
    const sanitizedValue = sanitizeXssValue(value[key], key, seen);

    if (sanitizedKey !== key) {
      delete value[key];
    }

    value[sanitizedKey] = sanitizedValue;
  }

  return value;
}

function sanitizeRequestProperty(
  request: XssProtectionRequest,
  property: SanitizableRequestProperty,
): void {
  const currentValue = request[property];
  const sanitizedValue = sanitizeXssValue(currentValue);

  if (sanitizedValue === currentValue) {
    return;
  }

  try {
    request[property] = sanitizedValue;
  } catch {
    return;
  }
}

@Injectable()
export class XssProtectionMiddleware
  implements NestMiddleware<XssProtectionRequest, unknown>
{
  use(
    request: XssProtectionRequest,
    _response: unknown,
    next: () => void,
  ): void {
    sanitizeRequestProperty(request, 'body');
    sanitizeRequestProperty(request, 'query');
    sanitizeRequestProperty(request, 'params');

    next();
  }
}
