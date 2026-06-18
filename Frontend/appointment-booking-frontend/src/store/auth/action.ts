import { createAppAsyncThunk } from '../createAppAsyncThunk';
import {
  confirmPasswordReset,
  extendSession,
  getCurrentSession,
  login,
  logout,
  refreshSession,
  register,
  requestPasswordReset,
  verifyPasswordResetCode,
} from '../../lib/api';
import type {
  AuthResponse,
  LoginPayload,
  LogoutResponse,
  PasswordResetConfirmPayload,
  PasswordResetConfirmResponse,
  PasswordResetRequestPayload,
  PasswordResetRequestResponse,
  PasswordResetVerifyPayload,
  PasswordResetVerifyResponse,
  RegisterPayload,
} from './types';

const SLICE_NAME = 'auth';

export const getCurrentSessionAction = createAppAsyncThunk<AuthResponse>(
  `${SLICE_NAME}/getCurrentSession`,
  async () => getCurrentSession(),
);

export const refreshSessionAction = createAppAsyncThunk<AuthResponse>(
  `${SLICE_NAME}/refreshSession`,
  async () => refreshSession(),
);

export const extendSessionAction = createAppAsyncThunk<AuthResponse>(
  `${SLICE_NAME}/extendSession`,
  async () => extendSession(),
);

export const loginAction = createAppAsyncThunk<AuthResponse, LoginPayload>(
  `${SLICE_NAME}/login`,
  async ({ email, password, remember, endExistingSessions }) =>
    login(email, password, remember, { endExistingSessions }),
);

export const registerAction = createAppAsyncThunk<AuthResponse, RegisterPayload>(
  `${SLICE_NAME}/register`,
  async (payload) => register(payload),
);

export const logoutAction = createAppAsyncThunk<LogoutResponse>(
  `${SLICE_NAME}/logout`,
  async () => logout(),
);

export const requestPasswordResetAction = createAppAsyncThunk<
  PasswordResetRequestResponse,
  PasswordResetRequestPayload
>(`${SLICE_NAME}/requestPasswordReset`, async (payload) =>
  requestPasswordReset(payload),
);

export const verifyPasswordResetCodeAction = createAppAsyncThunk<
  PasswordResetVerifyResponse,
  PasswordResetVerifyPayload
>(`${SLICE_NAME}/verifyPasswordResetCode`, async (payload) =>
  verifyPasswordResetCode(payload),
);

export const confirmPasswordResetAction = createAppAsyncThunk<
  PasswordResetConfirmResponse,
  PasswordResetConfirmPayload
>(`${SLICE_NAME}/confirmPasswordReset`, async (payload) =>
  confirmPasswordReset(payload),
);
