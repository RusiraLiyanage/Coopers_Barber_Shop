import { createAppAsyncThunk } from '../createAppAsyncThunk';
import {
  ApiRequestError,
  extendAdminSession,
  getAccountProfile,
  getCurrentSession,
  loginAdmin,
  logout,
  type AdminLoginPayload,
  type AccountProfileResponse,
} from '../../lib/api';
import type { AuthSession } from './types';

const SLICE_NAME = 'auth';
const PROFILE_RESTORE_RETRY_DELAY_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function shouldRetryProfileRestore(error: unknown): boolean {
  if (!(error instanceof ApiRequestError)) {
    return true;
  }

  return error.statusCode !== 401 && error.statusCode !== 403;
}

async function createAdminSession(): Promise<AuthSession> {
  let profile: AccountProfileResponse;

  try {
    profile = await getAccountProfile();
  } catch (error) {
    if (!shouldRetryProfileRestore(error)) {
      throw error;
    }

    await delay(PROFILE_RESTORE_RETRY_DELAY_MS);
    profile = await getAccountProfile();
  }

  return createAdminSessionFromProfile(profile);
}

function createAdminSessionFromProfile(
  profile: AccountProfileResponse,
): AuthSession {
  if (profile.role !== 'admin') {
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

  return response.user
    ? createAdminSessionFromProfile(response.user)
    : createAdminSession();
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
