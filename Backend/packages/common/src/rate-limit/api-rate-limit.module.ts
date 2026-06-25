import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import {
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerModuleOptions,
} from '@nestjs/throttler';
import {
  getRequiredConfigInteger,
  getRequiredEnvInteger,
} from '../configs/env.util';

const MILLISECONDS_PER_SECOND = 1000;

export type ApiRateLimitOptions = {
  ttlSeconds: number;
  maxRequests: number;
};

export function createApiRateLimitOptions(
  options: ApiRateLimitOptions,
): ThrottlerModuleOptions {
  return [
    {
      ttl: options.ttlSeconds * MILLISECONDS_PER_SECOND,
      limit: options.maxRequests,
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
  const ttlSeconds = getRequiredEnvInteger('LOGIN_RATE_LIMIT_TTL_SECONDS');
  const maxRequests = getRequiredEnvInteger('LOGIN_RATE_LIMIT_MAX_REQUESTS');

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
              ttlSeconds: getRequiredConfigInteger(
                config,
                'RATE_LIMIT_TTL_SECONDS',
              ),
              maxRequests: getRequiredConfigInteger(
                config,
                'RATE_LIMIT_MAX_REQUESTS',
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
