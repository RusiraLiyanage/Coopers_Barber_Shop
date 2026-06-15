import type { AccountProfileResponse } from '../../lib/api';

export type AuthSession = {
  authenticated: true;
  user: AccountProfileResponse;
};

export type AuthState = {
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
};
