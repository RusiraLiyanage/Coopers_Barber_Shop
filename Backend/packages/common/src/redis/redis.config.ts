import {
  REDIS_CACHE_DEFAULT_TTL_SECONDS_ENV,
  REDIS_CACHE_ENABLED_ENV,
} from './redis.constants';

export type RedisCacheRuntimeConfig = {
  enabled: boolean;
  defaultTtlSeconds: number;
};

export type RedisClientConfig = {
  host: string;
  port: number;
};

export function getRedisCacheRuntimeConfig(): RedisCacheRuntimeConfig {
  const enabled = isRedisCacheEnabled();

  return {
    enabled,
    defaultTtlSeconds: enabled
      ? getRequiredNonNegativeInteger(REDIS_CACHE_DEFAULT_TTL_SECONDS_ENV)
      : 0,
  };
}

export function getRedisClientConfig(
  hostEnv: string,
  portEnv: string,
): RedisClientConfig {
  return {
    host: getRequiredEnv(hostEnv),
    port: getRequiredPositiveInteger(portEnv),
  };
}

function isRedisCacheEnabled(): boolean {
  return process.env[REDIS_CACHE_ENABLED_ENV]?.toLowerCase() === 'true';
}

function getRequiredEnv(envName: string): string {
  const value = process.env[envName];

  if (value === undefined) {
    throw new Error(`${envName} is not configured`);
  }

  return value;
}

function getRequiredPositiveInteger(envName: string): number {
  const value = getRequiredEnv(envName);
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${envName} must be a positive integer`);
  }

  return parsedValue;
}

function getRequiredNonNegativeInteger(envName: string): number {
  const value = getRequiredEnv(envName);
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    throw new Error(`${envName} must be a positive integer or 0`);
  }

  return parsedValue;
}
