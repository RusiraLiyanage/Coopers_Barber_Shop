import type {
  AuthResponse,
  AuthSession,
  PasswordResetConfirmPayload,
  PasswordResetRequestPayload,
  PasswordResetVerifyPayload,
  RegisterPayload,
} from '../../lib/api';

export type {
  AuthResponse,
  AuthSession,
  PasswordResetConfirmPayload,
  PasswordResetRequestPayload,
  PasswordResetVerifyPayload,
  RegisterPayload,
};

export type LoginPayload = {
  email: string;
  password: string;
  remember: boolean;
};

export type LogoutResponse = {
  success: boolean;
};

export type PasswordResetRequestResponse = {
  success: true;
};

export type PasswordResetVerifyResponse = {
  valid: true;
};

export type PasswordResetConfirmResponse = {
  success: true;
};

export type AuthState = {
  session: AuthSession | null;
};
