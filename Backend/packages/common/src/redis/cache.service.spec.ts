/// <reference types="jest" />

import Redis from 'ioredis';
import { CacheService } from './cache.service';

type RedisMock = {
  del: jest.Mock;
  get: jest.Mock;
  ping: jest.Mock;
  scan: jest.Mock;
  set: jest.Mock;
  setex: jest.Mock;
};

function createRedisMock(): RedisMock {
  return {
    del: jest.fn(),
    get: jest.fn(),
    ping: jest.fn(),
    scan: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
  };
}

describe('CacheService', () => {
  const originalEnv = process.env;
  let redisPrimary: ReturnType<typeof createRedisMock>;
  let redisReader: ReturnType<typeof createRedisMock>;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      REDIS_CACHE_ENABLED: 'true',
      REDIS_CACHE_DEFAULT_TTL_SECONDS: '300',
    };
    redisPrimary = createRedisMock();
    redisReader = createRedisMock();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('returns parsed JSON when a cached value exists', async () => {
    redisReader.get.mockResolvedValue(JSON.stringify({ id: 'service-1' }));
    const service = new CacheService(
      redisPrimary as unknown as Redis,
      redisReader as unknown as Redis,
    );

    await expect(service.getJson<{ id: string }>('key-1')).resolves.toEqual({
      id: 'service-1',
    });
  });

  it('returns null when cached JSON is invalid', async () => {
    redisReader.get.mockResolvedValue('{bad-json');
    const service = new CacheService(
      redisPrimary as unknown as Redis,
      redisReader as unknown as Redis,
    );

    await expect(service.getJson('key-1')).resolves.toBeNull();
  });

  it('returns null when Redis read fails', async () => {
    redisReader.get.mockRejectedValue(new Error('reader unavailable'));
    const service = new CacheService(
      redisPrimary as unknown as Redis,
      redisReader as unknown as Redis,
    );

    await expect(service.getJson('key-1')).resolves.toBeNull();
  });

  it('writes JSON with the env default TTL', async () => {
    const service = new CacheService(
      redisPrimary as unknown as Redis,
      redisReader as unknown as Redis,
    );

    await service.setJson('key-1', { id: 'service-1' });

    expect(redisPrimary.setex.mock.calls).toEqual([
      ['key-1', 300, JSON.stringify({ id: 'service-1' })],
    ]);
  });

  it('does not throw when Redis write fails', async () => {
    redisPrimary.setex.mockRejectedValue(new Error('primary unavailable'));
    const service = new CacheService(
      redisPrimary as unknown as Redis,
      redisReader as unknown as Redis,
    );

    await expect(
      service.setJson('key-1', { id: 'service-1' }),
    ).resolves.toBeUndefined();
  });

  it('does not throw when Redis delete fails', async () => {
    redisPrimary.del.mockRejectedValue(new Error('primary unavailable'));
    const service = new CacheService(
      redisPrimary as unknown as Redis,
      redisReader as unknown as Redis,
    );

    await expect(service.deleteKey('key-1')).resolves.toBeUndefined();
  });

  it('does not throw when Redis pattern deletion fails', async () => {
    redisPrimary.scan.mockRejectedValue(new Error('primary unavailable'));
    const service = new CacheService(
      redisPrimary as unknown as Redis,
      redisReader as unknown as Redis,
    );

    await expect(
      service.deleteByPattern('consultation:*'),
    ).resolves.toBeUndefined();
  });

  it('reports disabled health when Redis caching is off', async () => {
    process.env.REDIS_CACHE_ENABLED = 'false';
    const service = new CacheService(
      redisPrimary as unknown as Redis,
      redisReader as unknown as Redis,
    );

    await expect(service.checkHealth()).resolves.toEqual({
      enabled: false,
      status: 'disabled',
    });
    expect(redisPrimary.ping.mock.calls).toHaveLength(0);
    expect(redisReader.ping.mock.calls).toHaveLength(0);
  });

  it('reports ok health when primary and reader respond', async () => {
    redisPrimary.ping.mockResolvedValue('PONG');
    redisReader.ping.mockResolvedValue('PONG');
    const service = new CacheService(
      redisPrimary as unknown as Redis,
      redisReader as unknown as Redis,
    );

    await expect(service.checkHealth()).resolves.toMatchObject({
      enabled: true,
      status: 'ok',
    });
  });

  it('reports unavailable health when Redis ping fails', async () => {
    redisPrimary.ping.mockRejectedValue(new Error('connection refused'));
    redisReader.ping.mockResolvedValue('PONG');
    const service = new CacheService(
      redisPrimary as unknown as Redis,
      redisReader as unknown as Redis,
    );

    await expect(service.checkHealth()).resolves.toEqual({
      enabled: true,
      status: 'unavailable',
      error: 'connection refused',
    });
  });
});
