import { UserRole } from '@coopers/entities';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  sid?: string;
}

export interface JwtRequestUser {
  userId: string;
  email: string;
  role: UserRole;
  sessionId?: string;
}

export interface JwtAuthenticatedRequest {
  user?: JwtRequestUser;
}
