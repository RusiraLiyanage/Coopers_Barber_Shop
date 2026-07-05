/// <reference types="jest" />

import { ConfigService } from '@nestjs/config';
import { AuthSession } from '@coopers/entities';
import { SessionService } from './session.service';

describe('SessionService transactions', () => {
  const sessionsRepo = {
    create: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
  const transactionalSessionsRepo = {
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };
  const transactionManager = {
    getRepository: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockImplementation((key: string): string | undefined => {
      if (key === 'REFRESH_TOKEN_TTL_DAYS') {
        return '14';
      }

      if (key === 'SESSION_IDLE_TIMEOUT_SECONDS') {
        return '900';
      }

      if (key === 'SESSION_EXTENSION_GRACE_SECONDS') {
        return '300';
      }

      return undefined;
    });
    transactionManager.getRepository.mockReturnValue(transactionalSessionsRepo);
    dataSource.transaction.mockImplementation(
      (callback: (manager: typeof transactionManager) => unknown) =>
        Promise.resolve(callback(transactionManager)),
    );
  });

  it('revokes the old session and creates the rotated session in one transaction', async () => {
    const service = new SessionService(
      sessionsRepo as never,
      configService as unknown as ConfigService,
      dataSource as never,
    );
    const currentSession = {
      id: 'session-1',
      user: { id: 'user-1' },
      tokenFamilyId: '00000000-0000-0000-0000-000000000001',
    } as AuthSession;
    const rotatedSession = {
      id: 'session-2',
      user: { id: 'user-1' },
      tokenFamilyId: currentSession.tokenFamilyId,
    };

    transactionalSessionsRepo.update.mockResolvedValue({});
    transactionalSessionsRepo.create.mockReturnValue(rotatedSession);
    transactionalSessionsRepo.save.mockResolvedValue(rotatedSession);

    await expect(
      service.replaceSessionRefreshToken(currentSession, 'new-refresh-token'),
    ).resolves.toBe(rotatedSession);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(transactionManager.getRepository).toHaveBeenCalledWith(AuthSession);
    expect(transactionalSessionsRepo.update).toHaveBeenCalledWith('session-1', {
      lastUsedAt: expect.any(Date) as Date,
      revokedAt: expect.any(Date) as Date,
    });
    expect(transactionalSessionsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { id: 'user-1' },
        tokenFamilyId: currentSession.tokenFamilyId,
        revokedAt: null,
      }),
    );
    expect(transactionalSessionsRepo.save).toHaveBeenCalledWith(rotatedSession);
    expect(sessionsRepo.update).not.toHaveBeenCalled();
    expect(sessionsRepo.save).not.toHaveBeenCalled();
  });

  it('allows a recently rotated refresh token to resolve to the active successor session', async () => {
    const service = new SessionService(
      sessionsRepo as never,
      configService as unknown as ConfigService,
      dataSource as never,
    );
    const tokenFamilyId = '00000000-0000-0000-0000-000000000001';
    const now = Date.now();
    const rotatedSession = {
      id: 'session-1',
      user: { id: 'user-1' },
      tokenFamilyId,
      revokedAt: new Date(now - 10_000),
      expiresAt: new Date(now + 86_400_000),
      lastUsedAt: new Date(now - 30_000),
      createdAt: new Date(now - 60_000),
    } as AuthSession;
    const activeSuccessorSession = {
      id: 'session-2',
      user: { id: 'user-1' },
      tokenFamilyId,
      revokedAt: null,
      expiresAt: new Date(now + 86_400_000),
      lastUsedAt: new Date(now - 30_000),
      createdAt: new Date(now - 5_000),
    } as AuthSession;

    sessionsRepo.findOne
      .mockResolvedValueOnce(rotatedSession)
      .mockResolvedValueOnce(activeSuccessorSession);

    await expect(service.findActiveSession('old-refresh-token')).resolves.toBe(
      activeSuccessorSession,
    );

    expect(sessionsRepo.createQueryBuilder).not.toHaveBeenCalled();
    expect(sessionsRepo.findOne).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          tokenFamilyId,
          revokedAt: null,
        },
      }),
    );
  });

  it('revokes the token family when a rotated refresh token is reused outside the race window', async () => {
    const service = new SessionService(
      sessionsRepo as never,
      configService as unknown as ConfigService,
      dataSource as never,
    );
    const tokenFamilyId = '00000000-0000-0000-0000-000000000001';
    const now = Date.now();
    const rotatedSession = {
      id: 'session-1',
      user: { id: 'user-1' },
      tokenFamilyId,
      revokedAt: new Date(now - 120_000),
      expiresAt: new Date(now + 86_400_000),
      lastUsedAt: new Date(now - 180_000),
      createdAt: new Date(now - 240_000),
    } as AuthSession;
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    sessionsRepo.findOne.mockResolvedValueOnce(rotatedSession);
    sessionsRepo.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(service.findActiveSession('old-refresh-token')).rejects.toThrow(
      'Refresh token reuse detected. Please login again.',
    );

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'token_family_id = :tokenFamilyId',
      { tokenFamilyId },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('revoked_at IS NULL');
    expect(queryBuilder.execute).toHaveBeenCalledTimes(1);
  });
});
