import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JWT_AUDIENCE, JWT_ISSUER } from '@coopers/common';
import { DataVersionModule } from '../data-version/data-version.module';
import { AdminRealtimeAuthService } from './admin-realtime-auth.service';
import { AdminRealtimeController } from './admin-realtime.controller';
import { AdminRealtimeGateway } from './admin-realtime.gateway';
import { AdminRealtimeNotifierService } from './admin-realtime-notifier.service';
import { AdminRealtimeService } from './admin-realtime.service';

@Global()
@Module({
  imports: [
    DataVersionModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        verifyOptions: {
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
        },
      }),
    }),
  ],
  controllers: [AdminRealtimeController],
  providers: [
    AdminRealtimeAuthService,
    AdminRealtimeGateway,
    AdminRealtimeNotifierService,
    AdminRealtimeService,
  ],
  exports: [AdminRealtimeNotifierService, AdminRealtimeService],
})
export class AdminRealtimeModule {}
