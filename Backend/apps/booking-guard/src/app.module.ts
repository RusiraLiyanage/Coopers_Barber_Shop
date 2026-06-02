import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  ApiRateLimitModule,
  createAppConfigOptions,
  GuardConfigModule,
  XssProtectionMiddleware,
} from '@coopers/common';
import { HealthController } from './health.controller';
import { ProxyModule } from './proxy/proxy.module';

@Module({
  imports: [
    ConfigModule.forRoot(createAppConfigOptions()),
    ApiRateLimitModule.forRoot(),
    GuardConfigModule,
    ProxyModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(XssProtectionMiddleware).forRoutes('*');
  }
}
