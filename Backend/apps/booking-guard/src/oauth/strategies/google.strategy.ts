import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { GuardConfigService } from '@coopers/common';
import { Profile, Strategy } from 'passport-google-oauth20';
import { NormalizedOAuthProfile } from '../oauth.types';

const DEFAULT_GOOGLE_CALLBACK_URL =
  'http://localhost:7311/auth/google/callback';

type GoogleEmail = {
  value: string;
  verified?: boolean;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function findPrimaryEmail(profile: Profile): GoogleEmail | undefined {
  const profileEmail = profile._json.email;

  if (profileEmail) {
    return {
      value: profileEmail,
      verified: profile._json.email_verified,
    };
  }

  return profile.emails?.find((email) => email.value.trim().length > 0);
}

function getConfiguredValue(
  guardConfig: GuardConfigService,
  key: keyof ReturnType<GuardConfigService['getGoogleOAuthConfig']>,
  fallback: string,
): string {
  try {
    return guardConfig.getGoogleOAuthConfig()[key] as string;
  } catch {
    return fallback;
  }
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(guardConfig: GuardConfigService) {
    super({
      clientID: getConfiguredValue(
        guardConfig,
        'clientId',
        'google-oauth-client-id-not-configured',
      ),
      clientSecret: getConfiguredValue(
        guardConfig,
        'clientSecret',
        'google-oauth-client-secret-not-configured',
      ),
      callbackURL: getConfiguredValue(
        guardConfig,
        'callbackUrl',
        DEFAULT_GOOGLE_CALLBACK_URL,
      ),
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): NormalizedOAuthProfile {
    const email = findPrimaryEmail(profile);

    if (!profile.id || !email?.value) {
      throw new UnauthorizedException(
        'Google profile is missing required identity information.',
      );
    }

    if (email.verified !== true) {
      throw new UnauthorizedException('Google email address is not verified.');
    }

    return {
      provider: 'google',
      providerUserId: profile.id,
      email: normalizeEmail(email.value),
      emailVerified: true,
      firstName: profile._json.given_name ?? profile.name?.givenName,
      lastName: profile._json.family_name ?? profile.name?.familyName,
      displayName: profile._json.name ?? profile.displayName,
      picture: profile._json.picture,
    };
  }
}
