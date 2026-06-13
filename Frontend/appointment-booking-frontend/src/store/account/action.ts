import { createAppAsyncThunk } from '../createAppAsyncThunk';
import { getAccountProfile, updateAccountProfile } from '../../lib/api';
import type { AccountProfile, UpdateAccountPayload } from './types';

const SLICE_NAME = 'account';

export const getAccountProfileAction = createAppAsyncThunk<AccountProfile>(
  `${SLICE_NAME}/getAccountProfile`,
  async () => getAccountProfile(),
);

export const updateAccountProfileAction = createAppAsyncThunk<
  AccountProfile,
  UpdateAccountPayload
>(`${SLICE_NAME}/updateAccountProfile`, async (payload) =>
  updateAccountProfile(payload),
);
