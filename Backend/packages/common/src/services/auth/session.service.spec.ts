/// <reference types="jest" />

import { ConfigService } from '@nestjs/config';
import { AuthSession } from '@coopers/entities';
import { SessionService } from './session.service';

describe('SessionService transactions', () => {
  const sessionsRepo = {
    create: jest.fn(),
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
});
