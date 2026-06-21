/// <reference types="jest" />

import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ACTIVE_ACCOUNT_SESSION_EXISTS_CODE,
  AuthenticatedUser,
} from '@coopers/common';
import { User, UserRole } from '@coopers/entities';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const user = {
    id: 'user-1',
    email: 'admin@coopers.test',
    passwordHash: 'hashed-password',
    firstName: 'Ada',
    lastName: 'Lovelace',
    mobile: null,
    suburb: null,
    role: UserRole.ADMIN,
  } as User;

  const authenticatedUser: AuthenticatedUser = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  let usersService: {
    findByEmail: jest.MockedFunction<(email: string) => Promise<User | null>>;
    create: jest.MockedFunction<(payload: unknown) => Promise<User>>;
  };
  let passwordService: {
    compare: jest.MockedFunction<
      (plainTextPassword: string, passwordHash: string) => Promise<boolean>
    >;
    hash: jest.MockedFunction<(plainTextPassword: string) => Promise<string>>;
  };
  let jwtTokenService: {
    generateRefreshToken: jest.MockedFunction<
      () => { refresh_token: string }
    >;
    signAccessToken: jest.MockedFunction<
      (
        user: AuthenticatedUser,
        sessionId: string,
      ) => { access_token: string; expires_in: number }
    >;
  };
  let sessionService: {
    hasActiveUserSession: jest.MockedFunction<
      (userId: string) => Promise<boolean>
    >;
    revokeUserSessions: jest.MockedFunction<(userId: string) => Promise<void>>;
    createSession: jest.MockedFunction<
      (payload: unknown) => Promise<{ id: string }>
    >;
  };
  let service: AuthService;

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };
    passwordService = {
      compare: jest.fn(),
      hash: jest.fn(),
    };
    jwtTokenService = {
      generateRefreshToken: jest.fn(),
      signAccessToken: jest.fn(),
    };
    sessionService = {
      hasActiveUserSession: jest.fn(),
      revokeUserSessions: jest.fn(),
      createSession: jest.fn(),
    };

    service = new AuthService(
      {} as never,
      {} as never,
      usersService as never,
      passwordService as never,
      jwtTokenService as never,
      sessionService as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('validates a user with matching credentials', async () => {
    usersService.findByEmail.mockResolvedValue(user);
    passwordService.compare.mockResolvedValue(true);

    await expect(
      service.validateUser(user.email, 'plain-password'),
    ).resolves.toEqual(authenticatedUser);

    expect(passwordService.compare).toHaveBeenCalledWith(
      'plain-password',
      user.passwordHash,
    );
  });

  it('rejects invalid credentials without leaking which field failed', async () => {
    usersService.findByEmail.mockResolvedValue(user);
    passwordService.compare.mockResolvedValue(false);

    await expect(
      service.validateUser(user.email, 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses admin login when a valid account has the wrong role', async () => {
    await expect(
      service.login(
        {
          ...authenticatedUser,
          role: UserRole.CUSTOMER,
        },
        { requiredRole: UserRole.ADMIN },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(sessionService.createSession).not.toHaveBeenCalled();
  });

  it('asks the caller to confirm before replacing an active session', async () => {
    sessionService.hasActiveUserSession.mockResolvedValue(true);

    await expect(service.login(authenticatedUser)).rejects.toMatchObject({
      response: {
        code: ACTIVE_ACCOUNT_SESSION_EXISTS_CODE,
      },
    });

    expect(sessionService.revokeUserSessions).not.toHaveBeenCalled();
    expect(sessionService.createSession).not.toHaveBeenCalled();
  });

  it('revokes the previous session and issues new tokens when confirmed', async () => {
    sessionService.hasActiveUserSession.mockResolvedValue(true);
    sessionService.createSession.mockResolvedValue({ id: 'session-2' });
    jwtTokenService.generateRefreshToken.mockReturnValue({
      refresh_token: 'refresh-token',
    });
    jwtTokenService.signAccessToken.mockReturnValue({
      access_token: 'access-token',
      expires_in: 900,
    });

    await expect(
      service.login(authenticatedUser, { endExistingSessions: true }),
    ).resolves.toEqual({
      access_token: 'access-token',
      expires_in: 900,
      refresh_token: 'refresh-token',
    });

    expect(sessionService.revokeUserSessions).toHaveBeenCalledWith(user.id);
    expect(sessionService.createSession).toHaveBeenCalledWith({
      userId: user.id,
      refreshToken: 'refresh-token',
    });
    expect(jwtTokenService.signAccessToken).toHaveBeenCalledWith(
      authenticatedUser,
      'session-2',
    );
  });
});
