import { ServiceUnavailableException } from '@nestjs/common';
import { GuardConfigService, GoogleOAuthConfig } from '@coopers/common';

export function getConfiguredGoogleOAuth(
  guardConfig: GuardConfigService,
): GoogleOAuthConfig {
  try {
    return guardConfig.getGoogleOAuthConfig();
  } catch {
    throw new ServiceUnavailableException('Google OAuth is not configured.');
  }
}
