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

// only 10 requests per 300 seconds are allowed. --> this rate limiting approach is to disallow brute force attacks

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
  return [
    {
      ttl: options.ttlSeconds ?? DEFAULT_RATE_LIMIT_TTL_SECONDS,
      limit: options.maxRequests ?? DEFAULT_RATE_LIMIT_MAX_REQUESTS,
    },
  ];
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
