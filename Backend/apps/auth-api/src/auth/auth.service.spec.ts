/// <reference types="jest" />

import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import {
  ACTIVE_ACCOUNT_SESSION_EXISTS_CODE,
  AuthenticatedUser,
} from '@coopers/common';
import {
  AuthSession,
  PasswordResetToken,
  User,
  UserRole,
} from '@coopers/entities';
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
    updatePassword: jest.MockedFunction<
      (userId: string, passwordHash: string) => Promise<void>
    >;
  };
  let passwordService: {
    compare: jest.MockedFunction<
      (plainTextPassword: string, passwordHash: string) => Promise<boolean>
    >;
    hash: jest.MockedFunction<(plainTextPassword: string) => Promise<string>>;
  };
  let jwtTokenService: {
    generateRefreshToken: jest.MockedFunction<() => { refresh_token: string }>;
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
    revokeUserSessions: jest.MockedFunction<
      (userId: string, manager?: unknown) => Promise<void>
    >;
    createSession: jest.MockedFunction<
      (payload: unknown, manager?: unknown) => Promise<{ id: string }>
    >;
  };
  let passwordResetTokensRepo: {
    findOne: jest.MockedFunction<(payload: unknown) => Promise<unknown>>;
    save: jest.MockedFunction<(payload: unknown) => Promise<unknown>>;
  };
  let configService: {
    get: jest.MockedFunction<(key: string) => string | undefined>;
  };
  let authSessionsQueryBuilder: {
    update: jest.MockedFunction<
      (entity: unknown) => typeof authSessionsQueryBuilder
    >;
    set: jest.MockedFunction<
      (payload: unknown) => typeof authSessionsQueryBuilder
    >;
    where: jest.MockedFunction<
      (
        condition: string,
        parameters: unknown,
      ) => typeof authSessionsQueryBuilder
    >;
    andWhere: jest.MockedFunction<
      (condition: string) => typeof authSessionsQueryBuilder
    >;
    execute: jest.MockedFunction<() => Promise<unknown>>;
  };
  let transactionalPasswordResetTokensRepo: {
    findOne: jest.MockedFunction<(payload: unknown) => Promise<unknown>>;
    save: jest.MockedFunction<(payload: unknown) => Promise<unknown>>;
  };
  let transactionalUsersRepo: {
    update: jest.MockedFunction<
      (id: string, payload: unknown) => Promise<unknown>
    >;
  };
  let transactionalAuthSessionsRepo: {
    createQueryBuilder: jest.MockedFunction<
      () => typeof authSessionsQueryBuilder
    >;
  };
  let transactionManager: {
    getRepository: jest.MockedFunction<(entity: unknown) => unknown>;
  };
  let dataSource: {
    transaction: jest.MockedFunction<
      (
        callback: (manager: typeof transactionManager) => unknown,
      ) => Promise<unknown>
    >;
  };
  let service: AuthService;

  beforeEach(() => {
    passwordResetTokensRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      updatePassword: jest.fn(),
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
    configService = {
      get: jest.fn((key: string): string | undefined => {
        if (key === 'PASSWORD_RESET_MAX_ATTEMPTS') {
          return '5';
        }

        if (key === 'PASSWORD_RESET_TTL_MINUTES') {
          return '10';
        }

        return undefined;
      }),
    };
    authSessionsQueryBuilder = {
      update: jest.fn(),
      set: jest.fn(),
      where: jest.fn(),
      andWhere: jest.fn(),
      execute: jest.fn(),
    };
    authSessionsQueryBuilder.update.mockReturnValue(authSessionsQueryBuilder);
    authSessionsQueryBuilder.set.mockReturnValue(authSessionsQueryBuilder);
    authSessionsQueryBuilder.where.mockReturnValue(authSessionsQueryBuilder);
    authSessionsQueryBuilder.andWhere.mockReturnValue(authSessionsQueryBuilder);
    authSessionsQueryBuilder.execute.mockResolvedValue({});
    transactionalPasswordResetTokensRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    transactionalUsersRepo = {
      update: jest.fn(),
    };
    transactionalAuthSessionsRepo = {
      createQueryBuilder: jest.fn(),
    };
    transactionalAuthSessionsRepo.createQueryBuilder.mockReturnValue(
      authSessionsQueryBuilder,
    );
    transactionManager = {
      getRepository: jest.fn(),
    };
    transactionManager.getRepository.mockImplementation((entity) => {
      if (entity === PasswordResetToken) {
        return transactionalPasswordResetTokensRepo;
      }

      if (entity === User) {
        return transactionalUsersRepo;
      }

      if (entity === AuthSession) {
        return transactionalAuthSessionsRepo;
      }

      throw new Error('Unexpected repository requested');
    });
    dataSource = {
      transaction: jest.fn(),
    };
    dataSource.transaction.mockImplementation((callback) =>
      Promise.resolve(callback(transactionManager)),
    );

    service = new AuthService(
      passwordResetTokensRepo as never,
      {} as never,
      usersService as never,
      passwordService as never,
      jwtTokenService as never,
      sessionService as never,
      {} as never,
      configService as never,
      {} as never,
      dataSource as never,
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

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(sessionService.revokeUserSessions).toHaveBeenCalledWith(
      user.id,
      transactionManager,
    );
    expect(sessionService.createSession).toHaveBeenCalledWith(
      {
        userId: user.id,
        refreshToken: 'refresh-token',
      },
      transactionManager,
    );
    expect(jwtTokenService.signAccessToken).toHaveBeenCalledWith(
      authenticatedUser,
      'session-2',
    );
  });

  it('updates password, consumes reset token, and revokes sessions in one transaction', async () => {
    const resetToken = {
      id: 'reset-token-1',
      email: user.email,
      codeHash: 'hashed-reset-code',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      attemptCount: 0,
      user,
    };
    const lockedResetToken = { ...resetToken };

    passwordResetTokensRepo.findOne.mockResolvedValue(resetToken);
    passwordService.compare.mockResolvedValue(true);
    passwordService.hash.mockResolvedValue('new-password-hash');
    transactionalPasswordResetTokensRepo.findOne.mockResolvedValue(
      lockedResetToken,
    );
    transactionalUsersRepo.update.mockResolvedValue({});
    transactionalPasswordResetTokensRepo.save.mockResolvedValue(
      lockedResetToken,
    );

    await expect(
      service.confirmPasswordReset({
        email: user.email,
        code: '123456',
        password: 'NewPassword123!',
      }),
    ).resolves.toEqual({ success: true });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(transactionalPasswordResetTokensRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'reset-token-1' },
      relations: { user: true },
      lock: { mode: 'pessimistic_write' },
    });
    expect(transactionalUsersRepo.update).toHaveBeenCalledWith(user.id, {
      passwordHash: 'new-password-hash',
    });
    expect(transactionalPasswordResetTokensRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        usedAt: expect.any(Date) as Date,
      }),
    );
    expect(authSessionsQueryBuilder.update).toHaveBeenCalledWith(AuthSession);
    expect(authSessionsQueryBuilder.set).toHaveBeenCalledWith({
      revokedAt: expect.any(Date) as Date,
    });
    expect(authSessionsQueryBuilder.where).toHaveBeenCalledWith(
      'user_id = :userId',
      { userId: user.id },
    );
    expect(authSessionsQueryBuilder.andWhere).toHaveBeenCalledWith(
      'revoked_at IS NULL',
    );
    expect(authSessionsQueryBuilder.execute).toHaveBeenCalledTimes(1);
    expect(usersService.updatePassword).not.toHaveBeenCalled();
    expect(sessionService.revokeUserSessions).not.toHaveBeenCalled();
  });
});
