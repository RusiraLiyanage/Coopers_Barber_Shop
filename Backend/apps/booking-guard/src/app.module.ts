import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  ApiRateLimitModule,
  createAppConfigOptions,
  GuardConfigModule,
  XssProtectionMiddleware,
} from '@coopers/common';
import { HealthController } from './health.controller';
import { OAuthModule } from './oauth/oauth.module';
import { ProxyModule } from './proxy/proxy.module';

@Module({
  imports: [
    ConfigModule.forRoot(createAppConfigOptions()), // configuration key and values are injected into the App Module
    ApiRateLimitModule.forRoot(), // adding rate limitor to the application
    GuardConfigModule,
    OAuthModule,
    ProxyModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(XssProtectionMiddleware).forRoutes('*');
  }
}
