import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { GuardConfigModule } from '@coopers/common';
import { ProxyModule } from '../proxy/proxy.module';
import { GoogleOAuthController } from './google-oauth.controller';
import { GoogleOAuthSessionService } from './google-oauth-session.service';
import { GoogleOAuthCallbackGuard } from './guards/google-oauth-callback.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [GuardConfigModule, PassportModule, ProxyModule],
  controllers: [GoogleOAuthController],
  providers: [
    GoogleStrategy,
    GoogleOAuthGuard,
    GoogleOAuthCallbackGuard,
    GoogleOAuthSessionService,
  ],
})
export class OAuthModule {}
