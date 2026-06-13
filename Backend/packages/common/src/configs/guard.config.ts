import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type GuardUpstreamConfig = {
  bookingApiUrl: string;
  authApiUrl: string;
  frontendUrl: string;
};

function normalizeServiceUrl(value: string): string {
  return value.replace(/\/+$/, ''); // get rid of any end slashes of the url
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
    return getOptionalPort(this.config, 'GUARD_PORT', 7311);
  }

  // Shared secret attached to every upstream request so auth-api/booking-api can
  // verify the call originated from the guard. Fails fast at startup if missing.
  get internalGatewaySecret(): string {
    return getRequiredString(this.config, 'INTERNAL_GATEWAY_SECRET');
  }

  getUpstreams(): GuardUpstreamConfig {
    return {
      bookingApiUrl: normalizeServiceUrl(
        getRequiredString(this.config, 'BOOKING_API_URL'),
      ),
      authApiUrl: normalizeServiceUrl(
        getRequiredString(this.config, 'AUTH_API_URL'),
      ),
      frontendUrl: normalizeServiceUrl(
        this.config.get<string>('FRONTEND_DEV_URL') ?? this.frontendUrl,
      ),
    };
  }
}
