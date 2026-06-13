import { createAsyncThunk } from '@reduxjs/toolkit';
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

const BASE_URL = 'auth';

export const getCurrentSessionAction = createAsyncThunk<AuthResponse>(
  `${BASE_URL}/getCurrentSession`,
  async () => getCurrentSession(),
);

export const refreshSessionAction = createAsyncThunk<AuthResponse>(
  `${BASE_URL}/refreshSession`,
  async () => refreshSession(),
);

export const extendSessionAction = createAsyncThunk<AuthResponse>(
  `${BASE_URL}/extendSession`,
  async () => extendSession(),
);

export const loginAction = createAsyncThunk<AuthResponse, LoginPayload>(
  `${BASE_URL}/login`,
  async ({ email, password, remember }) => login(email, password, remember),
);

export const registerAction = createAsyncThunk<AuthResponse, RegisterPayload>(
  `${BASE_URL}/register`,
  async (payload) => register(payload),
);

export const logoutAction = createAsyncThunk<LogoutResponse>(
  `${BASE_URL}/logout`,
  async () => logout(),
);

export const requestPasswordResetAction = createAsyncThunk<
  PasswordResetRequestResponse,
  PasswordResetRequestPayload
>(`${BASE_URL}/requestPasswordReset`, async (payload) =>
  requestPasswordReset(payload),
);

export const verifyPasswordResetCodeAction = createAsyncThunk<
  PasswordResetVerifyResponse,
  PasswordResetVerifyPayload
>(`${BASE_URL}/verifyPasswordResetCode`, async (payload) =>
  verifyPasswordResetCode(payload),
);

export const confirmPasswordResetAction = createAsyncThunk<
  PasswordResetConfirmResponse,
  PasswordResetConfirmPayload
>(`${BASE_URL}/confirmPasswordReset`, async (payload) =>
  confirmPasswordReset(payload),
);
