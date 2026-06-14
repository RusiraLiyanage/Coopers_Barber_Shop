import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticateOptionsGoogle } from 'passport-google-oauth20';
import { GuardConfigService } from '@coopers/common';
import { getConfiguredGoogleOAuth } from '../oauth-config.util';
import type { NormalizedOAuthProfile } from '../oauth.types';
import {
  clearGoogleOAuthStateCookie,
  getOAuthStateFromQuery,
  isValidGoogleOAuthState,
  OAuthStateCookieResponse,
} from '../oauth-state-cookie.util';

type GoogleCallbackRequest = {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, unknown>;
};

@Injectable()
export class GoogleOAuthCallbackGuard extends AuthGuard('google') {
  constructor(private readonly guardConfig: GuardConfigService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    getConfiguredGoogleOAuth(this.guardConfig);

    const request = context.switchToHttp().getRequest<GoogleCallbackRequest>();
    const response = context
      .switchToHttp()
      .getResponse<OAuthStateCookieResponse>();
    const cookieHeader = this.getHeaderValue(request.headers.cookie);
    const providedState = getOAuthStateFromQuery(request.query);

    if (!isValidGoogleOAuthState(cookieHeader, providedState)) {
      clearGoogleOAuthStateCookie(response);
      throw new UnauthorizedException('Invalid Google OAuth state.');
    }

    return (await super.canActivate(context)) as boolean;
  }

  getAuthenticateOptions(): AuthenticateOptionsGoogle {
    return {
      session: false,
    };
  }

  handleRequest<TUser = NormalizedOAuthProfile>(
    err: unknown,
    user: TUser | false | null,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    const response = context
      .switchToHttp()
      .getResponse<OAuthStateCookieResponse>();

    clearGoogleOAuthStateCookie(response);

    if (err || !user) {
      throw new UnauthorizedException('Google authentication failed.');
    }

    return user;
  }

  private getHeaderValue(
    value: string | string[] | undefined,
  ): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }
}
