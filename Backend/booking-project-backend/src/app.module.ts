import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { AppointmentsModule } from './appontments/appointments.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// All the modules related to this application are imported here.

@Module({
  imports: [
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    ThrottlerModule.forRoot([
      {
        ttl: 300, // time-to-live in seconds
        limit: 10, // max requests per ttl
      },
    ]),
    DatabaseModule,
    UsersModule,
    AuthModule,
    ServicesModule,
    AppointmentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      useClass: ThrottlerGuard, // In ThrottlerGuard to avoid Spammers/brute force attacks
    },
  ],
})
export class AppModule {}
