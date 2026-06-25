import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRequiredConfigInteger, getRequiredConfigString } from './env.util';

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

@Injectable()
export class GuardConfigService {
  constructor(private readonly config: ConfigService) {}

  get frontendUrl(): string {
    return getRequiredConfigString(this.config, 'FRONTEND_URL');
  }

  get adminFrontendUrl(): string {
    const adminFrontendUrl =
      this.config.get<string>('ADMIN_FRONTEND_DEV_URL') ??
      getRequiredConfigString(this.config, 'ADMIN_FRONTEND_URL');

    return normalizeServiceUrl(getFirstConfiguredUrl(adminFrontendUrl));
  }

  get guardPort(): number {
    return getRequiredConfigInteger(this.config, 'GUARD_PORT');
  }

  // Shared secret attached to every upstream request so auth-api/booking-api can
  // verify the call originated from the guard. Fails fast at startup if missing.
  get internalGatewaySecret(): string {
    return getRequiredConfigString(this.config, 'INTERNAL_GATEWAY_SECRET');
  }

  getUpstreams(): GuardUpstreamConfig {
    return {
      bookingApiUrl: normalizeServiceUrl(
        getRequiredConfigString(this.config, 'BOOKING_API_URL'),
      ),
      authApiUrl: normalizeServiceUrl(
        getRequiredConfigString(this.config, 'AUTH_API_URL'),
      ),
      adminApiUrl: normalizeServiceUrl(
        getRequiredConfigString(this.config, 'ADMIN_API_URL'),
      ),
      frontendUrl: normalizeServiceUrl(
        this.config.get<string>('FRONTEND_DEV_URL') ?? this.frontendUrl,
      ),
      adminFrontendUrl: this.adminFrontendUrl,
    };
  }

  getGoogleOAuthConfig(): GoogleOAuthConfig {
    return {
      clientId: getRequiredConfigString(this.config, 'GOOGLE_CLIENT_ID'),
      clientSecret: getRequiredConfigString(
        this.config,
        'GOOGLE_CLIENT_SECRET',
      ),
      callbackUrl: getRequiredConfigString(this.config, 'GOOGLE_CALLBACK_URL'),
      successRedirectUrl: getRequiredConfigString(
        this.config,
        'OAUTH_SUCCESS_REDIRECT_URL',
      ),
      failureRedirectUrl: getRequiredConfigString(
        this.config,
        'OAUTH_FAILURE_REDIRECT_URL',
      ),
      scope: ['email', 'profile'],
    };
  }
}
