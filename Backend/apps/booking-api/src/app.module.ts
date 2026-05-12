import { Module } from '@nestjs/common';
import { DatabaseModule } from '@coopers/database';
import { ConfigModule } from '@nestjs/config';
import { createAppConfigOptions } from '@coopers/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { AppointmentsModule } from './appontments/appointments.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// All the modules related to this application are imported here.

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 300, // time-to-live in seconds
        limit: 10, // max requests per ttl
      },
    ]),
    ConfigModule.forRoot(createAppConfigOptions()),
    DatabaseModule.forRoot(),
    UsersModule,
    AuthModule,
    ServicesModule,
    AppointmentsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,

      useClass: ThrottlerGuard, // In ThrottlerGuard to avoid Spammers/brute force attacks
    },
  ],
})
export class AppModule {}
