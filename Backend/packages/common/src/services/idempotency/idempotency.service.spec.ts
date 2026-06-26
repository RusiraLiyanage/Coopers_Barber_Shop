/// <reference types="jest" />

import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IdempotencyKey, IdempotencyKeyStatus } from '@coopers/entities';
import { IdempotencyService } from './idempotency.service';

describe('IdempotencyService', () => {
  const idempotencyKeyRepository = {
    create: jest.fn(),
    delete: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    save: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockImplementation((key: string): string | undefined => {
      if (key === 'IDEMPOTENCY_KEY_TTL_SECONDS') {
        return '86400';
      }

      return undefined;
    });
  });

  function createService(): IdempotencyService {
    return new IdempotencyService(
      idempotencyKeyRepository as never,
      configService as unknown as ConfigService,
    );
  }

  function createRecord(record: Partial<IdempotencyKey>): IdempotencyKey {
    return {
      id: 'idempotency-record-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: record.userId ?? 'user-1' },
      ...record,
    } as IdempotencyKey;
  }

  function stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value) ?? 'undefined';
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    }

    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(
        ([key, entryValue]) =>
          `${JSON.stringify(key)}:${stableStringify(entryValue)}`,
      )
      .join(',')}}`;
  }

  function hashRequestBody(requestBody: unknown): string {
    return createHash('sha256')
      .update(stableStringify(requestBody))
      .digest('hex');
  }

  it('creates a processing record for a new idempotency key', async () => {
    const service = createService();
    const createdRecord = createRecord({
      key: 'request-key-1',
      userId: 'user-1',
      status: IdempotencyKeyStatus.PROCESSING,
    });

    idempotencyKeyRepository.findOne.mockResolvedValue(null);
    idempotencyKeyRepository.create.mockReturnValue(createdRecord);
    idempotencyKeyRepository.save.mockResolvedValue(createdRecord);

    await expect(
      service.reserve({
        key: ' request-key-1 ',
        method: 'post',
        path: '/appointments',
        requestBody: { serviceId: 'svc-1', date: '2026-06-26' },
        userId: 'user-1',
      }),
    ).resolves.toEqual({
      kind: 'created',
      record: createdRecord,
    });

    expect(idempotencyKeyRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'request-key-1',
        userId: 'user-1',
        user: { id: 'user-1' },
        method: 'POST',
        path: '/appointments',
        status: IdempotencyKeyStatus.PROCESSING,
        responseStatusCode: null,
        responseBody: null,
        expiresAt: expect.any(Date) as Date,
      }),
    );
  });

  it('returns the stored response for a completed matching request', async () => {
    const service = createService();
    const responseBody = { id: 'appointment-1' };
    const requestBody = { date: '2026-06-26', serviceId: 'svc-1' };
    const existingRecord = createRecord({
      key: 'request-key-1',
      userId: 'user-1',
      method: 'POST',
      path: '/appointments',
      requestHash: hashRequestBody(requestBody),
      status: IdempotencyKeyStatus.COMPLETED,
      responseStatusCode: 201,
      responseBody,
      expiresAt: new Date(Date.now() + 60_000),
    });

    idempotencyKeyRepository.findOne.mockResolvedValue(existingRecord);

    await expect(
      service.reserve({
        key: 'request-key-1',
        method: 'POST',
        path: '/appointments',
        requestBody,
        userId: 'user-1',
      }),
    ).resolves.toEqual({
      kind: 'completed',
      responseBody,
      responseStatusCode: 201,
    });

    expect(idempotencyKeyRepository.create).not.toHaveBeenCalled();
    expect(idempotencyKeyRepository.save).not.toHaveBeenCalled();
  });

  it('rejects an idempotency key reused for a different request', async () => {
    const service = createService();
    const existingRecord = createRecord({
      key: 'request-key-1',
      userId: 'user-1',
      method: 'POST',
      path: '/appointments',
      requestHash: 'different-hash',
      status: IdempotencyKeyStatus.COMPLETED,
      responseStatusCode: 201,
      responseBody: { id: 'appointment-1' },
      expiresAt: new Date(Date.now() + 60_000),
    });

    idempotencyKeyRepository.findOne.mockResolvedValue(existingRecord);

    await expect(
      service.reserve({
        key: 'request-key-1',
        method: 'POST',
        path: '/appointments',
        requestBody: { serviceId: 'svc-2' },
        userId: 'user-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('marks records as completed or failed', async () => {
    const service = createService();
    const record = {
      status: IdempotencyKeyStatus.PROCESSING,
      responseStatusCode: null,
      responseBody: null,
    } as IdempotencyKey;

    idempotencyKeyRepository.save.mockImplementation(
      (savedRecord: IdempotencyKey) => Promise.resolve(savedRecord),
    );

    await service.complete({
      record,
      responseStatusCode: 201,
      responseBody: { id: 'appointment-1' },
    });

    expect(idempotencyKeyRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: IdempotencyKeyStatus.COMPLETED,
        responseStatusCode: 201,
        responseBody: { id: 'appointment-1' },
      }),
    );

    await service.markFailed(record);

    expect(idempotencyKeyRepository.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: IdempotencyKeyStatus.FAILED,
      }),
    );
  });

  it('rejects missing idempotency keys and deletes expired records', async () => {
    const service = createService();

    await expect(
      service.reserve({
        key: ' ',
        method: 'POST',
        path: '/appointments',
        requestBody: {},
        userId: 'user-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    idempotencyKeyRepository.delete.mockResolvedValue({ affected: 3 });

    await expect(service.deleteExpired()).resolves.toBe(3);
  });
});
