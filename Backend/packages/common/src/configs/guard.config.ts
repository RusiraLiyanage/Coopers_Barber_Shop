import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type GuardUpstreamConfig = {
  bookingApiUrl: string;
  authApiUrl: string;
  adminApiUrl: string;
  frontendUrl: string;
  adminFrontendUrl: string;
};

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  successRedirectUrl: string;
  failureRedirectUrl: string;
  scope: string[];
};

function normalizeServiceUrl(value: string): string {
  return value.replace(/\/+$/, ''); // get rid of any end slashes of the url
}

function getFirstConfiguredUrl(value: string): string {
  return value.split(',')[0]?.trim() ?? value;
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

  get adminFrontendUrl(): string {
    const adminFrontendUrl =
      this.config.get<string>('ADMIN_FRONTEND_DEV_URL') ??
      this.config.get<string>('ADMIN_FRONTEND_URL');

    return normalizeServiceUrl(
      adminFrontendUrl ? getFirstConfiguredUrl(adminFrontendUrl) : this.frontendUrl,
    );
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
      adminApiUrl: normalizeServiceUrl(
        getRequiredString(this.config, 'ADMIN_API_URL'),
      ),
      frontendUrl: normalizeServiceUrl(
        this.config.get<string>('FRONTEND_DEV_URL') ?? this.frontendUrl,
      ),
      adminFrontendUrl: this.adminFrontendUrl,
    };
  }

  getGoogleOAuthConfig(): GoogleOAuthConfig {
    return {
      clientId: getRequiredString(this.config, 'GOOGLE_CLIENT_ID'),
      clientSecret: getRequiredString(this.config, 'GOOGLE_CLIENT_SECRET'),
      callbackUrl: getRequiredString(this.config, 'GOOGLE_CALLBACK_URL'),
      successRedirectUrl: getRequiredString(
        this.config,
        'OAUTH_SUCCESS_REDIRECT_URL',
      ),
      failureRedirectUrl: getRequiredString(
        this.config,
        'OAUTH_FAILURE_REDIRECT_URL',
      ),
      scope: ['email', 'profile'],
    };
  }
}
