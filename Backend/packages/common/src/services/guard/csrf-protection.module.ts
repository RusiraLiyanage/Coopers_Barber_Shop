import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SameOriginCsrfGuard } from './same-origin-csrf.guard';

// Registers the Origin/Referer CSRF check as a global guard. Intended for the
// browser-facing gateway only; internal upstreams are reached server-to-server
// and are guarded by the gateway secret instead. Relies on the globally
// available ConfigModule for the configured frontend origins.
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: SameOriginCsrfGuard,
    },
  ],
})
export class CsrfProtectionModule {}
