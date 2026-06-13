import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { InternalServiceGuard } from './internal-service.guard';

// Registers the gateway-secret check as a global guard. Coexists with the
// ThrottlerGuard APP_GUARD; both run for every request. Relies on the globally
// available ConfigModule for INTERNAL_GATEWAY_SECRET.
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: InternalServiceGuard,
    },
  ],
})
export class InternalServiceAuthModule {}
