/// <reference types="jest" />

import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { IdempotencyCleanupService } from './idempotency-cleanup.service';
import { IdempotencyService } from './idempotency.service';

describe('IdempotencyCleanupService', () => {
  const idempotencyService = {
    deleteExpired: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    configService.get.mockImplementation((key: string): string | undefined => {
      if (key === 'IDEMPOTENCY_KEY_CLEANUP_INTERVAL_SECONDS') {
        return '60';
      }

      return undefined;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function createService(): IdempotencyCleanupService {
    return new IdempotencyCleanupService(
      idempotencyService as unknown as IdempotencyService,
      configService as unknown as ConfigService,
    );
  }

  it('deletes expired keys on startup and interval', async () => {
    const service = createService();

    idempotencyService.deleteExpired.mockResolvedValue(0);

    service.onModuleInit();
    await Promise.resolve();

    expect(idempotencyService.deleteExpired).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60_000);
    await Promise.resolve();

    expect(idempotencyService.deleteExpired).toHaveBeenCalledTimes(2);

    service.onModuleDestroy();
  });

  it('stops the interval on module destroy', async () => {
    const service = createService();

    idempotencyService.deleteExpired.mockResolvedValue(0);

    service.onModuleInit();
    service.onModuleDestroy();

    jest.advanceTimersByTime(60_000);
    await Promise.resolve();

    expect(idempotencyService.deleteExpired).toHaveBeenCalledTimes(1);
  });

  it('does not throw when cleanup fails', async () => {
    const service = createService();
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();

    idempotencyService.deleteExpired.mockRejectedValue(new Error('db failed'));

    expect(() => service.onModuleInit()).not.toThrow();
    await Promise.resolve();

    service.onModuleDestroy();
    loggerSpy.mockRestore();
  });
});
