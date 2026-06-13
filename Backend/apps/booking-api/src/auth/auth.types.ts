import { UserRole } from '@coopers/entities';

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

export interface JwtAuthenticatedRequest {
  user: JwtRequestUser;
}
