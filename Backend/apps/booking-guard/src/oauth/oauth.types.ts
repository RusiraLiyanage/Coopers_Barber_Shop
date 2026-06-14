export type OAuthProviderName = 'google';

export type NormalizedOAuthProfile = {
  provider: OAuthProviderName;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
};

export type OAuthAuthenticatedRequest = {
  user: NormalizedOAuthProfile;
};
