import { createAsyncThunk } from '@reduxjs/toolkit';
import { getAccountProfile, updateAccountProfile } from '../../lib/api';
import type { AccountProfile, UpdateAccountPayload } from './types';

const BASE_URL = 'account';

export const getAccountProfileAction = createAsyncThunk<AccountProfile>(
  `${BASE_URL}/getAccountProfile`,
  async () => getAccountProfile(),
);

export const updateAccountProfileAction = createAsyncThunk<
  AccountProfile,
  UpdateAccountPayload
>(`${BASE_URL}/updateAccountProfile`, async (payload) =>
  updateAccountProfile(payload),
);
