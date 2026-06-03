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

export interface SessionValidationResponse {
  active: boolean;
}
