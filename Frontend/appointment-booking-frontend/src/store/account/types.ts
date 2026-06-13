import type { AccountProfile, UpdateAccountPayload } from '../../lib/api';

export type { AccountProfile, UpdateAccountPayload };

export type AccountState = {
  profile: AccountProfile | null;
  loading: boolean;
  saving: boolean;
};
