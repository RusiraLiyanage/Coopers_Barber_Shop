import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  createAppConfigOptions,
  InternalServiceAuthModule,
  XssProtectionMiddleware,
} from '@coopers/common';
import { DatabaseModule } from '@coopers/database';
import { AdminAuthModule } from './auth/admin-auth.module';
import { BarbersModule } from './barbers/barbers.module';
import { BriefsModule } from './briefs/briefs.module';
import { DataVersionModule } from './data-version/data-version.module';
import { HairHistoryModule } from './hair-history/hair-history.module';
import { HealthController } from './health.controller';
import { InvitesModule } from './invites/invites.module';
import { ReferenceDataModule } from './reference-data/reference-data.module';
import { SafetyRulesModule } from './safety-rules/safety-rules.module';
import { AdminServicesModule } from './services/admin-services.module';

@Module({
  imports: [
    ConfigModule.forRoot(createAppConfigOptions()),
    // Throttling is centralised on the booking-guard (the edge), where the real
    // client IP is known. This internal API only ever sees the guard's IP, so a
    // per-IP limit here would be a global cap, not per-user protection.
    InternalServiceAuthModule,
    DatabaseModule.forRoot(),
    AdminAuthModule,
    BarbersModule,
    ReferenceDataModule,
    SafetyRulesModule,
    AdminServicesModule,
    BriefsModule,
    HairHistoryModule,
    InvitesModule,
    DataVersionModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(XssProtectionMiddleware).forRoutes('*');
  }
}
