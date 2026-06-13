import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  ApiRateLimitModule,
  createAppConfigOptions,
  InternalServiceAuthModule,
  XssProtectionMiddleware,
} from '@coopers/common';
import { DatabaseModule } from '@coopers/database';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot(createAppConfigOptions()), // configuration key and values are injected into the App Module
    ApiRateLimitModule.forRoot(),
    InternalServiceAuthModule, // only the booking-guard (which holds the shared secret) may reach this API
    DatabaseModule.forRoot(),
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(XssProtectionMiddleware).forRoutes('*');
  }
}
