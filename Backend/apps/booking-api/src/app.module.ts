import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DatabaseModule } from '@coopers/database';
import { ConfigModule } from '@nestjs/config';
import {
  ApiRateLimitModule,
  createAppConfigOptions,
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
    ConfigModule.forRoot(createAppConfigOptions()),
    ApiRateLimitModule.forRoot(),
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
