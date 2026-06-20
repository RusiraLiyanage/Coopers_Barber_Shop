import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import {
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerModuleOptions,
} from '@nestjs/throttler';

export const DEFAULT_RATE_LIMIT_TTL_SECONDS = 300;
export const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 10;
// Login is brute-force bait, so it gets a tighter bucket than the generic limit:
// 5 attempts per 5 minutes per client IP by default.
export const DEFAULT_LOGIN_RATE_LIMIT_TTL_SECONDS = 300;
export const DEFAULT_LOGIN_RATE_LIMIT_MAX_REQUESTS = 5;
const MILLISECONDS_PER_SECOND = 1000;

// by default, only 10 requests per 300 seconds are allowed.

type RateLimitConfigValue = string | number | undefined;

export type ApiRateLimitOptions = {
  ttlSeconds?: number;
  maxRequests?: number;
};

// convert the incase string values from the env file into integer values
function toPositiveNumber(
  value: RateLimitConfigValue,
  fallback: number,
): number {
  const parsedValue = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsedValue) && parsedValue > 0
    ? Math.floor(parsedValue) // if it is finite, then it will be rounded.
    : fallback;
}

export function createApiRateLimitOptions(
  options: ApiRateLimitOptions = {},
): ThrottlerModuleOptions {
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_RATE_LIMIT_TTL_SECONDS;

  return [
    {
      ttl: ttlSeconds * MILLISECONDS_PER_SECOND,
      limit: options.maxRequests ?? DEFAULT_RATE_LIMIT_MAX_REQUESTS,
    },
  ];
}

// Per-route override applied with @Throttle on the login endpoints. Keyed on the
// "default" throttler so it tightens the same bucket the global guard manages.
// Tunable via LOGIN_RATE_LIMIT_* without redeploying code.
export function createLoginThrottleOptions(): Record<
  'default',
  { limit: number; ttl: number }
> {
  const ttlSeconds = toPositiveNumber(
    process.env.LOGIN_RATE_LIMIT_TTL_SECONDS,
    DEFAULT_LOGIN_RATE_LIMIT_TTL_SECONDS,
  );
  const maxRequests = toPositiveNumber(
    process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS,
    DEFAULT_LOGIN_RATE_LIMIT_MAX_REQUESTS,
  );

  return {
    default: {
      limit: maxRequests,
      ttl: ttlSeconds * MILLISECONDS_PER_SECOND,
    },
  };
}

@Module({})
export class ApiRateLimitModule {
  static forRoot(): DynamicModule {
    return {
      module: ApiRateLimitModule,
      imports: [
        ThrottlerModule.forRootAsync({
          inject: [ConfigService], // config service is from the configModule
          useFactory: (config: ConfigService): ThrottlerModuleOptions =>
            createApiRateLimitOptions({
              ttlSeconds: toPositiveNumber(
                config.get<RateLimitConfigValue>('RATE_LIMIT_TTL_SECONDS'),
                DEFAULT_RATE_LIMIT_TTL_SECONDS,
              ),
              maxRequests: toPositiveNumber(
                config.get<RateLimitConfigValue>('RATE_LIMIT_MAX_REQUESTS'),
                DEFAULT_RATE_LIMIT_MAX_REQUESTS,
              ),
            }),
        }),
      ],
      providers: [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
    };
  }
}
