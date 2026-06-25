import { DynamicModule, Global, Logger, Module } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
import { CacheService } from './cache.service';
import { getRedisClientConfig } from './redis.config';
import { REDIS_CLUSTER } from './redis.constants';

type RedisProviderConfig = {
  hostEnv: string;
  portEnv: string;
  token: string;
};

const redisProviderConfigs: RedisProviderConfig[] = [
  {
    token: REDIS_CLUSTER.PRIMARY,
    hostEnv: 'REDIS_PRIMARY_HOST',
    portEnv: 'REDIS_PRIMARY_PORT',
  },
  {
    token: REDIS_CLUSTER.READER,
    hostEnv: 'REDIS_READER_HOST',
    portEnv: 'REDIS_READER_PORT',
  },
];

@Global()
@Module({})
export class RedisModule {
  private static readonly logger = new Logger(RedisModule.name);

  public static forRoot(): DynamicModule {
    const providers = redisProviderConfigs.map((config) => ({
      provide: config.token,
      useFactory: (): Redis => this.createRedisClient(config),
    }));

    return {
      module: RedisModule,
      providers: [...providers, CacheService],
      exports: [...providers, CacheService],
    };
  }

  private static createRedisClient(config: RedisProviderConfig): Redis {
    const clientConfig = getRedisClientConfig(config.hostEnv, config.portEnv);
    const client = new Redis({
      host: clientConfig.host,
      port: clientConfig.port,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    } satisfies RedisOptions);

    client.on('error', (error: Error) => {
      this.logger.warn(`${config.token} unavailable: ${error.message}`);
    });

    return client;
  }
}
