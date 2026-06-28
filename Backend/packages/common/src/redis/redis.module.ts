import { DynamicModule, Global, Logger, Module } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
import { CacheService } from './cache.service';
import {
  getRedisCacheRuntimeConfig,
  getRedisClientConfig,
} from './redis.config';
import { REDIS_CLUSTER } from './redis.constants';

type RedisProviderConfig = {
  hostEnv: string;
  passwordEnv: string;
  portEnv: string;
  tlsEnabledEnv: string;
  token: string;
  usernameEnv: string;
};

const redisProviderConfigs: RedisProviderConfig[] = [
  {
    token: REDIS_CLUSTER.PRIMARY,
    hostEnv: 'REDIS_PRIMARY_HOST',
    portEnv: 'REDIS_PRIMARY_PORT',
    usernameEnv: 'REDIS_PRIMARY_USERNAME',
    passwordEnv: 'REDIS_PRIMARY_PASSWORD',
    tlsEnabledEnv: 'REDIS_PRIMARY_TLS_ENABLED',
  },
  {
    token: REDIS_CLUSTER.READER,
    hostEnv: 'REDIS_READER_HOST',
    portEnv: 'REDIS_READER_PORT',
    usernameEnv: 'REDIS_READER_USERNAME',
    passwordEnv: 'REDIS_READER_PASSWORD',
    tlsEnabledEnv: 'REDIS_READER_TLS_ENABLED',
  },
];

@Global()
@Module({})
export class RedisModule {
  private static readonly logger = new Logger(RedisModule.name);

  public static forRoot(): DynamicModule {
    const cacheConfig = getRedisCacheRuntimeConfig();

    if (!cacheConfig.enabled) {
      this.logger.log('Redis cache disabled; Redis clients will not be created.');
    }

    const providers = redisProviderConfigs.map((config) => ({
      provide: config.token,
      useFactory: (): Redis | undefined =>
        cacheConfig.enabled ? this.createRedisClient(config) : undefined,
    }));

    return {
      module: RedisModule,
      providers: [...providers, CacheService],
      exports: [...providers, CacheService],
    };
  }

  private static createRedisClient(config: RedisProviderConfig): Redis {
    const clientConfig = getRedisClientConfig(
      config.hostEnv,
      config.portEnv,
      config.usernameEnv,
      config.passwordEnv,
      config.tlsEnabledEnv,
    );
    const client = new Redis({
      host: clientConfig.host,
      password: clientConfig.password,
      port: clientConfig.port,
      tls: clientConfig.tlsEnabled ? {} : undefined,
      username: clientConfig.username,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    } satisfies RedisOptions);

    client.on('error', (error: Error) => {
      this.logger.warn(`${config.token} unavailable: ${error.message}`);
    });

    return client;
  }
}
