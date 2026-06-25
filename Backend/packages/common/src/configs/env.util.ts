import { ConfigService } from '@nestjs/config';

export function getRequiredConfigString(
  config: ConfigService,
  key: string,
): string {
  const value = config.get<string>(key);

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing env variable: ${key}`);
  }

  return value.trim();
}

export function getRequiredConfigNumber(
  config: ConfigService,
  key: string,
): number {
  return parseRequiredPositiveNumber(getRequiredConfigString(config, key), key);
}

export function getRequiredConfigInteger(
  config: ConfigService,
  key: string,
): number {
  return parseRequiredPositiveInteger(
    getRequiredConfigString(config, key),
    key,
  );
}

export function getRequiredEnvString(key: string): string {
  const value = process.env[key];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing env variable: ${key}`);
  }

  return value.trim();
}

export function getRequiredEnvNumber(key: string): number {
  return parseRequiredPositiveNumber(getRequiredEnvString(key), key);
}

export function getRequiredEnvInteger(key: string): number {
  return parseRequiredPositiveInteger(getRequiredEnvString(key), key);
}

export function parseRequiredBoolean(value: string, key: string): boolean {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === 'true') {
    return true;
  }

  if (normalizedValue === 'false') {
    return false;
  }

  throw new Error(`${key} must be true or false`);
}

function parseRequiredPositiveNumber(value: string, key: string): number {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`${key} must be a positive number`);
  }

  return parsedValue;
}

function parseRequiredPositiveInteger(value: string, key: string): number {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }

  return parsedValue;
}
