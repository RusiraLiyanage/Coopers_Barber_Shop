import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import {
  REDIS_CACHE_DEFAULT_TTL_SECONDS_ENV,
  REDIS_CACHE_ENABLED_ENV,
  REDIS_CLUSTER,
} from './redis.constants';

export type CacheHealth = {
  enabled: boolean;
  latencyMs?: number;
  status: 'disabled' | 'ok' | 'unavailable';
  error?: string;
};

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly cacheEnabled: boolean;
  private readonly defaultTtlSeconds: number;

  public constructor(
    @Inject(REDIS_CLUSTER.PRIMARY)
    private readonly redisPrimary: Redis,
    @Inject(REDIS_CLUSTER.READER)
    private readonly redisReader: Redis,
  ) {
    this.cacheEnabled =
      process.env[REDIS_CACHE_ENABLED_ENV]?.toLowerCase() === 'true';
    this.defaultTtlSeconds = this.cacheEnabled
      ? this.getDefaultCacheTtlSeconds()
      : 0;
  }

  public async getCachedData(key: string): Promise<string | null> {
    if (!this.isCacheEnabled()) {
      return null;
    }

    try {
      const cachedValue = await this.redisReader.get(key);

      if (cachedValue !== null) {
        this.logger.debug(`Redis cache hit: ${key}`);
      }

      return cachedValue;
    } catch (error) {
      this.logRedisFailure('read', key, error);
      return null;
    }
  }

  public async getJson<T>(key: string): Promise<T | null> {
    const cachedValue = await this.getCachedData(key);

    if (cachedValue === null) {
      return null;
    }

    try {
      return JSON.parse(cachedValue) as T;
    } catch (error) {
      this.logRedisFailure('parse', key, error);
      return null;
    }
  }

  public async setCachedData(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<void> {
    if (!this.isCacheEnabled()) {
      return;
    }

    try {
      const resolvedTtlSeconds = ttlSeconds ?? this.defaultTtlSeconds;

      if (resolvedTtlSeconds > 0) {
        await this.redisPrimary.setex(key, resolvedTtlSeconds, value);
        return;
      }

      await this.redisPrimary.set(key, value);
    } catch (error) {
      this.logRedisFailure('write', key, error);
    }
  }

  public async setJson(
    key: string,
    value: unknown,
    ttlSeconds?: number,
  ): Promise<void> {
    await this.setCachedData(key, JSON.stringify(value), ttlSeconds);
  }

  public async deleteKey(key: string): Promise<void> {
    if (!this.isCacheEnabled()) {
      return;
    }

    try {
      await this.redisPrimary.del(key);
    } catch (error) {
      this.logRedisFailure('delete', key, error);
    }
  }

  public async deleteByPattern(pattern: string): Promise<void> {
    if (!this.isCacheEnabled()) {
      return;
    }

    try {
      let cursor = '0';

      do {
        const [nextCursor, keys] = await this.redisPrimary.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );

        if (keys.length > 0) {
          await this.redisPrimary.del(...keys);
        }

        cursor = nextCursor;
      } while (cursor !== '0');
    } catch (error) {
      this.logRedisFailure('delete pattern', pattern, error);
    }
  }

  public async checkHealth(): Promise<CacheHealth> {
    if (!this.isCacheEnabled()) {
      return {
        enabled: false,
        status: 'disabled',
      };
    }

    const startedAt = Date.now();

    try {
      await Promise.all([this.redisPrimary.ping(), this.redisReader.ping()]);

      return {
        enabled: true,
        latencyMs: Date.now() - startedAt,
        status: 'ok',
      };
    } catch (error) {
      return {
        enabled: true,
        status: 'unavailable',
        error: this.formatErrorMessage(error),
      };
    }
  }

  private isCacheEnabled(): boolean {
    return this.cacheEnabled;
  }

  private getDefaultCacheTtlSeconds(): number {
    const ttlValue = process.env[REDIS_CACHE_DEFAULT_TTL_SECONDS_ENV];

    if (ttlValue === undefined) {
      throw new Error(
        `${REDIS_CACHE_DEFAULT_TTL_SECONDS_ENV} is not configured`,
      );
    }

    const ttlSeconds = Number(ttlValue);

    if (!Number.isInteger(ttlSeconds) || ttlSeconds < 0) {
      throw new Error(
        `${REDIS_CACHE_DEFAULT_TTL_SECONDS_ENV} must be a positive integer or 0`,
      );
    }

    return ttlSeconds;
  }

  private logRedisFailure(
    operation: string,
    key: string,
    error: unknown,
  ): void {
    const message = this.formatErrorMessage(error);
    this.logger.warn(`Redis cache ${operation} failed for ${key}: ${message}`);
  }

  private formatErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Unknown Redis error';
  }
}
