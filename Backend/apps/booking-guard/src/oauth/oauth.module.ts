import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { GuardConfigModule } from '@coopers/common';
import { GoogleOAuthController } from './google-oauth.controller';
import { GoogleOAuthCallbackGuard } from './guards/google-oauth-callback.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [GuardConfigModule, PassportModule],
  controllers: [GoogleOAuthController],
  providers: [GoogleStrategy, GoogleOAuthGuard, GoogleOAuthCallbackGuard],
})
export class OAuthModule {}
