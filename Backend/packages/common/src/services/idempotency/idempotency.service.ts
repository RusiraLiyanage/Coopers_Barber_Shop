import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IdempotencyKey, IdempotencyKeyStatus } from '@coopers/entities';
import { LessThanOrEqual, Repository } from 'typeorm';
import { getRequiredConfigInteger } from '../../configs/env.util';

type JsonValue =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

type IdempotencyContextInput = {
  key: string;
  method: string;
  path: string;
  requestBody: unknown;
  userId: string;
};

type IdempotencyCompleteInput = {
  record: IdempotencyKey;
  responseBody: JsonValue;
  responseStatusCode: number;
};

export type IdempotencyReservation =
  | {
      kind: 'created';
      record: IdempotencyKey;
    }
  | {
      kind: 'completed';
      responseBody: JsonValue;
      responseStatusCode: number;
    }
  | {
      kind: 'processing';
    };

@Injectable()
export class IdempotencyService {
  public constructor(
    @InjectRepository(IdempotencyKey)
    private readonly idempotencyKeyRepository: Repository<IdempotencyKey>,
    private readonly configService: ConfigService,
  ) {}

  public async reserve(
    input: IdempotencyContextInput,
  ): Promise<IdempotencyReservation> {
    const key = input.key.trim();

    if (!key) {
      throw new BadRequestException('Idempotency-Key header is required.');
    }

    const requestHash = this.hashRequest(input.requestBody);
    const existingRecord = await this.idempotencyKeyRepository.findOne({
      where: {
        key,
        userId: input.userId,
      },
    });

    if (existingRecord) {
      if (existingRecord.expiresAt <= new Date()) {
        await this.idempotencyKeyRepository.remove(existingRecord);
        return this.createProcessingRecord(input, key, requestHash);
      }

      this.assertSameRequest(existingRecord, input, requestHash);

      if (
        existingRecord.status === IdempotencyKeyStatus.COMPLETED &&
        existingRecord.responseStatusCode !== null
      ) {
        return {
          kind: 'completed',
          responseBody: existingRecord.responseBody,
          responseStatusCode: existingRecord.responseStatusCode,
        };
      }

      return { kind: 'processing' };
    }

    return this.createProcessingRecord(input, key, requestHash);
  }

  public async complete(input: IdempotencyCompleteInput): Promise<void> {
    input.record.status = IdempotencyKeyStatus.COMPLETED;
    input.record.responseStatusCode = input.responseStatusCode;
    input.record.responseBody = input.responseBody;

    await this.idempotencyKeyRepository.save(input.record);
  }

  public async markFailed(record: IdempotencyKey): Promise<void> {
    record.status = IdempotencyKeyStatus.FAILED;

    await this.idempotencyKeyRepository.save(record);
  }

  public async deleteExpired(now = new Date()): Promise<number> {
    const result = await this.idempotencyKeyRepository.delete({
      expiresAt: LessThanOrEqual(now),
    });

    return result.affected ?? 0;
  }

  private createProcessingRecord(
    input: IdempotencyContextInput,
    key: string,
    requestHash: string,
  ): Promise<IdempotencyReservation> {
    const record = this.idempotencyKeyRepository.create({
      key,
      userId: input.userId,
      user: { id: input.userId },
      method: input.method.toUpperCase(),
      path: input.path,
      requestHash,
      status: IdempotencyKeyStatus.PROCESSING,
      responseStatusCode: null,
      responseBody: null,
      expiresAt: this.createExpiresAt(),
    });

    return this.idempotencyKeyRepository.save(record).then((savedRecord) => ({
      kind: 'created',
      record: savedRecord,
    }));
  }

  private assertSameRequest(
    record: IdempotencyKey,
    input: IdempotencyContextInput,
    requestHash: string,
  ): void {
    if (
      record.requestHash !== requestHash ||
      record.method !== input.method.toUpperCase() ||
      record.path !== input.path
    ) {
      throw new ConflictException(
        'Idempotency key was already used for a different request.',
      );
    }
  }

  private createExpiresAt(): Date {
    const ttlSeconds = getRequiredConfigInteger(
      this.configService,
      'IDEMPOTENCY_KEY_TTL_SECONDS',
    );
    const expiresAt = new Date();

    expiresAt.setSeconds(expiresAt.getSeconds() + ttlSeconds);

    return expiresAt;
  }

  private hashRequest(requestBody: unknown): string {
    return createHash('sha256')
      .update(this.stableStringify(requestBody))
      .digest('hex');
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([leftKey], [rightKey]) => leftKey.localeCompare(rightKey),
    );

    return `{${entries
      .map(
        ([key, entryValue]) =>
          `${JSON.stringify(key)}:${this.stableStringify(entryValue)}`,
      )
      .join(',')}}`;
  }
}
