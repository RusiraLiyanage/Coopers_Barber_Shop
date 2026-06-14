import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { GuardConfigModule, GuardConfigService } from '@coopers/common';
import { ProxyModule } from '../proxy/proxy.module';
import { GoogleOAuthController } from './google-oauth.controller';
import { GoogleOAuthSessionService } from './google-oauth-session.service';
import { GoogleOAuthCallbackGuard } from './guards/google-oauth-callback.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { GoogleStrategy } from './strategies/google.strategy';

// The strategy registers itself with Passport at construction and now requires
// the Google OAuth env to be present. Build it only when configured so the guard
// still boots without Google set up — the OAuth guards return 503 at request
// time in that case.
const googleStrategyProvider = {
  provide: GoogleStrategy,
  useFactory: (guardConfig: GuardConfigService): GoogleStrategy | null => {
    try {
      guardConfig.getGoogleOAuthConfig();
    } catch {
      return null;
    }

    return new GoogleStrategy(guardConfig);
  },
  inject: [GuardConfigService],
};

@Module({
  imports: [GuardConfigModule, PassportModule, ProxyModule],
  controllers: [GoogleOAuthController],
  providers: [
    googleStrategyProvider,
    GoogleOAuthGuard,
    GoogleOAuthCallbackGuard,
    GoogleOAuthSessionService,
  ],
})
export class OAuthModule {}
