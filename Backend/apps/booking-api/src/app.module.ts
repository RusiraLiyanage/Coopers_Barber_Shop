import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DatabaseModule } from '@coopers/database';
import { ConfigModule } from '@nestjs/config';
import {
  ApiRateLimitModule,
  createAppConfigOptions,
  InternalServiceAuthModule,
  XssProtectionMiddleware,
} from '@coopers/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { AppointmentsModule } from './appontments/appointments.module';
import { HealthController } from './health.controller';

// All the modules related to this application are imported here.

@Module({
  imports: [
    ConfigModule.forRoot(createAppConfigOptions()), // configuration key and values are injected into the App Module
    ApiRateLimitModule.forRoot(), // adding rate limitor to the application
    InternalServiceAuthModule, // only the booking-guard (which holds the shared secret) may reach this API
    DatabaseModule.forRoot(),
    UsersModule,
    AuthModule,
    ServicesModule,
    AppointmentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(XssProtectionMiddleware).forRoutes('*');
  }
}
