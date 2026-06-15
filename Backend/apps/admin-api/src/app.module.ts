import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  ApiRateLimitModule,
  createAppConfigOptions,
  InternalServiceAuthModule,
  XssProtectionMiddleware,
} from '@coopers/common';
import { DatabaseModule } from '@coopers/database';
import { AdminAuthModule } from './auth/admin-auth.module';
import { BarbersModule } from './barbers/barbers.module';
import { BriefsModule } from './briefs/briefs.module';
import { HairHistoryModule } from './hair-history/hair-history.module';
import { HealthController } from './health.controller';
import { InvitesModule } from './invites/invites.module';
import { SafetyRulesModule } from './safety-rules/safety-rules.module';
import { AdminServicesModule } from './services/admin-services.module';

@Module({
  imports: [
    ConfigModule.forRoot(createAppConfigOptions()),
    ApiRateLimitModule.forRoot(),
    InternalServiceAuthModule,
    DatabaseModule.forRoot(),
    AdminAuthModule,
    BarbersModule,
    SafetyRulesModule,
    AdminServicesModule,
    BriefsModule,
    HairHistoryModule,
    InvitesModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(XssProtectionMiddleware).forRoutes('*');
  }
}
