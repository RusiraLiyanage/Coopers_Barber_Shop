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
}

export interface JwtRequestUser {
  userId: string;
  email: string;
  role: UserRole;
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
