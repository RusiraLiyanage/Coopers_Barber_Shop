import { createAppAsyncThunk } from '../createAppAsyncThunk';
import {
  extendAdminSession,
  getAccountProfile,
  getCurrentSession,
  loginAdmin,
  logout,
  type AdminLoginPayload,
} from '../../lib/api';
import type { AuthSession } from './types';

const SLICE_NAME = 'auth';

async function createAdminSession(): Promise<AuthSession> {
  const profile = await getAccountProfile();

  if (profile.role !== 'admin') {
    await logout().catch(() => undefined);
    throw new Error('Admin access required.');
  }

  return {
    authenticated: true,
    user: profile,
  };
}

export const getCurrentSessionAction = createAppAsyncThunk<AuthSession>(
  `${SLICE_NAME}/getCurrentSession`,
  async () => {
    const response = await getCurrentSession();

    if (!response.authenticated) {
      throw new Error('Authentication failed');
    }

    return createAdminSession();
  },
);

export const loginAdminAction = createAppAsyncThunk<
  AuthSession,
  AdminLoginPayload
>(`${SLICE_NAME}/loginAdmin`, async (payload) => {
  const response = await loginAdmin(payload);

  if (!response.authenticated) {
    throw new Error('Authentication failed');
  }

  return createAdminSession();
});

export const extendAdminSessionAction = createAppAsyncThunk<AuthSession>(
  `${SLICE_NAME}/extendAdminSession`,
  async () => {
    const response = await extendAdminSession();

    if (!response.authenticated) {
      throw new Error('Authentication failed');
    }

    return createAdminSession();
  },
);

export const logoutAction = createAppAsyncThunk<{ success: boolean }>(
  `${SLICE_NAME}/logout`,
  async () => logout(),
);
