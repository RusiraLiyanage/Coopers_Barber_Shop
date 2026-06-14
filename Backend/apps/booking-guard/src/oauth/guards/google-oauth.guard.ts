import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticateOptionsGoogle } from 'passport-google-oauth20';
import { GuardConfigService } from '@coopers/common';
import { getConfiguredGoogleOAuth } from '../oauth-config.util';
import {
  createOAuthState,
  OAuthStateCookieResponse,
  setGoogleOAuthStateCookie,
} from '../oauth-state-cookie.util';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  constructor(private readonly guardConfig: GuardConfigService) {
    super();
  }

  getAuthenticateOptions(context: ExecutionContext): AuthenticateOptionsGoogle {
    const googleConfig = getConfiguredGoogleOAuth(this.guardConfig);
    const response = context
      .switchToHttp()
      .getResponse<OAuthStateCookieResponse>();
    const state = createOAuthState();

    setGoogleOAuthStateCookie(response, state);

    return {
      accessType: 'online',
      prompt: 'select_account',
      scope: googleConfig.scope,
      session: false,
      state,
    };
  }
}
