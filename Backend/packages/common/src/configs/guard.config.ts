import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type GuardUpstreamConfig = {
  bookingApiUrl: string;
  authApiUrl: string;
};

function normalizeServiceUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function getRequiredString(config: ConfigService, key: string): string {
  const value = config.get<string>(key);

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing env variable: ${key}`);
  }

  return value.trim();
}

function getOptionalPort(
  config: ConfigService,
  key: string,
  fallback: number,
): number {
  const value = config.get<string | number>(key);
  const port = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(port) && port > 0 ? port : fallback;
}

@Injectable()
export class GuardConfigService {
  constructor(private readonly config: ConfigService) {}

  get frontendUrl(): string {
    return getRequiredString(this.config, 'FRONTEND_URL');
  }

  get guardPort(): number {
    return getOptionalPort(this.config, 'GUARD_PORT', 3001);
  }

  getUpstreams(): GuardUpstreamConfig {
    return {
      bookingApiUrl: normalizeServiceUrl(
        getRequiredString(this.config, 'BOOKING_API_URL'),
      ),
      authApiUrl: normalizeServiceUrl(
        getRequiredString(this.config, 'AUTH_API_URL'),
      ),
    };
  }
}
