import { UserRole } from '@coopers/entities';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  sid: string;
}

export interface JwtRequestUser {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

export interface JwtAuthenticatedRequest {
  user: JwtRequestUser;
}

export interface AccessTokenResponse {
  access_token: string;
}

export interface RefreshTokenResponse {
  refresh_token: string;
}

export interface AuthTokensResponse
  extends AccessTokenResponse,
    RefreshTokenResponse {}

export interface LogoutResponse {
  success: boolean;
}

export const SESSION_IDLE_EXPIRED_CODE = 'SESSION_IDLE_EXPIRED';
export const SESSION_EXPIRED_CODE = 'SESSION_EXPIRED';

export interface ActiveSessionValidationResponse {
  active: true;
}

export interface InactiveSessionValidationResponse {
  active: false;
  code?: typeof SESSION_IDLE_EXPIRED_CODE | typeof SESSION_EXPIRED_CODE;
  message?: string;
  canExtend?: boolean;
}

export type SessionValidationResponse =
  | ActiveSessionValidationResponse
  | InactiveSessionValidationResponse;
