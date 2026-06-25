/// <reference types="jest" />

import {
  getRedisCacheRuntimeConfig,
  getRedisClientConfig,
} from './redis.config';

describe('Redis config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns disabled cache config without requiring a TTL', () => {
    process.env.REDIS_CACHE_ENABLED = 'false';
    delete process.env.REDIS_CACHE_DEFAULT_TTL_SECONDS;

    expect(getRedisCacheRuntimeConfig()).toEqual({
      enabled: false,
      defaultTtlSeconds: 0,
    });
  });

  it('returns enabled cache config with the configured default TTL', () => {
    process.env.REDIS_CACHE_ENABLED = 'true';
    process.env.REDIS_CACHE_DEFAULT_TTL_SECONDS = '300';

    expect(getRedisCacheRuntimeConfig()).toEqual({
      enabled: true,
      defaultTtlSeconds: 300,
    });
  });

  it('requires a TTL when Redis caching is enabled', () => {
    process.env.REDIS_CACHE_ENABLED = 'true';
    delete process.env.REDIS_CACHE_DEFAULT_TTL_SECONDS;

    expect(() => getRedisCacheRuntimeConfig()).toThrow(
      'REDIS_CACHE_DEFAULT_TTL_SECONDS is not configured',
    );
  });

  it('rejects invalid cache TTL values', () => {
    process.env.REDIS_CACHE_ENABLED = 'true';
    process.env.REDIS_CACHE_DEFAULT_TTL_SECONDS = '-1';

    expect(() => getRedisCacheRuntimeConfig()).toThrow(
      'REDIS_CACHE_DEFAULT_TTL_SECONDS must be a positive integer or 0',
    );
  });

  it('parses Redis client host and port', () => {
    process.env.REDIS_PRIMARY_HOST = 'localhost';
    process.env.REDIS_PRIMARY_PORT = '6379';

    expect(
      getRedisClientConfig('REDIS_PRIMARY_HOST', 'REDIS_PRIMARY_PORT'),
    ).toEqual({
      host: 'localhost',
      port: 6379,
    });
  });

  it('requires Redis client host env values', () => {
    delete process.env.REDIS_PRIMARY_HOST;
    process.env.REDIS_PRIMARY_PORT = '6379';

    expect(() =>
      getRedisClientConfig('REDIS_PRIMARY_HOST', 'REDIS_PRIMARY_PORT'),
    ).toThrow('REDIS_PRIMARY_HOST is not configured');
  });

  it('requires Redis client ports to be positive integers', () => {
    process.env.REDIS_PRIMARY_HOST = 'localhost';
    process.env.REDIS_PRIMARY_PORT = '0';

    expect(() =>
      getRedisClientConfig('REDIS_PRIMARY_HOST', 'REDIS_PRIMARY_PORT'),
    ).toThrow('REDIS_PRIMARY_PORT must be a positive integer');
  });
});
