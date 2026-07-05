import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { sendRuntimeAlert } from '../alerts/runtime-alert';
import { getRedisCacheRuntimeConfig } from './redis.config';
import { REDIS_CLUSTER } from './redis.constants';

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
    private readonly redisPrimary: Redis | undefined,
    @Inject(REDIS_CLUSTER.READER)
    private readonly redisReader: Redis | undefined,
  ) {
    const cacheConfig = getRedisCacheRuntimeConfig();

    this.cacheEnabled = cacheConfig.enabled;
    this.defaultTtlSeconds = cacheConfig.defaultTtlSeconds;
  }

  public async getCachedData(key: string): Promise<string | null> {
    if (!this.isCacheEnabled()) {
      return null;
    }

    const redisReader = this.redisReader;

    if (redisReader === undefined) {
      this.logRedisClientMissing('read', key);
      return null;
    }

    const startedAt = Date.now();

    try {
      const cachedValue = await redisReader.get(key);
      const latencyMs = Date.now() - startedAt;

      if (cachedValue !== null) {
        this.logger.debug(`Redis cache hit: ${key} (${latencyMs}ms)`);
        return cachedValue;
      }

      this.logger.debug(`Redis cache miss: ${key} (${latencyMs}ms)`);
      return null;
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

    const redisPrimary = this.redisPrimary;

    if (redisPrimary === undefined) {
      this.logRedisClientMissing('write', key);
      return;
    }

    try {
      const startedAt = Date.now();
      const resolvedTtlSeconds = ttlSeconds ?? this.defaultTtlSeconds;

      if (resolvedTtlSeconds > 0) {
        await redisPrimary.setex(key, resolvedTtlSeconds, value);
        this.logger.debug(
          `Redis cache write: ${key} (${Date.now() - startedAt}ms, ttl=${resolvedTtlSeconds}s)`,
        );
        return;
      }

      await redisPrimary.set(key, value);
      this.logger.debug(
        `Redis cache write: ${key} (${Date.now() - startedAt}ms, ttl=none)`,
      );
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

    const redisPrimary = this.redisPrimary;

    if (redisPrimary === undefined) {
      this.logRedisClientMissing('delete', key);
      return;
    }

    try {
      const startedAt = Date.now();
      await redisPrimary.del(key);
      this.logger.debug(
        `Redis cache delete: ${key} (${Date.now() - startedAt}ms)`,
      );
    } catch (error) {
      this.logRedisFailure('delete', key, error);
    }
  }

  public async deleteByPattern(pattern: string): Promise<void> {
    if (!this.isCacheEnabled()) {
      return;
    }

    const redisPrimary = this.redisPrimary;

    if (redisPrimary === undefined) {
      this.logRedisClientMissing('delete pattern', pattern);
      return;
    }

    try {
      let cursor = '0';
      let deletedKeyCount = 0;
      const startedAt = Date.now();

      do {
        const [nextCursor, keys] = await redisPrimary.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );

        if (keys.length > 0) {
          await redisPrimary.del(...keys);
          deletedKeyCount += keys.length;
        }

        cursor = nextCursor;
      } while (cursor !== '0');

      this.logger.debug(
        `Redis cache delete pattern: ${pattern} (${Date.now() - startedAt}ms, deleted=${deletedKeyCount})`,
      );
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

    const redisPrimary = this.redisPrimary;
    const redisReader = this.redisReader;

    if (redisPrimary === undefined || redisReader === undefined) {
      return {
        enabled: true,
        status: 'unavailable',
        error: 'Redis clients are not configured.',
      };
    }

    const startedAt = Date.now();

    try {
      await Promise.all([redisPrimary.ping(), redisReader.ping()]);

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

  private logRedisClientMissing(operation: string, key: string): void {
    const detail = `Redis cache ${operation} skipped for ${key}: Redis clients are not configured.`;

    this.logger.warn(detail);
    sendRuntimeAlert({
      category: 'redis-cache-client-missing',
      detail,
      severity: 'warning',
      throttleSeconds: 900,
    });
  }

  private logRedisFailure(
    operation: string,
    key: string,
    error: unknown,
  ): void {
    const message = this.formatErrorMessage(error);
    const detail = `Redis cache ${operation} failed for ${key}: ${message}`;

    this.logger.warn(detail);
    sendRuntimeAlert({
      category: 'redis-cache-failure',
      detail,
      error,
      severity: 'warning',
      throttleSeconds: 900,
    });
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
