import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getRequiredConfigInteger,
  sendRuntimeAlert,
  SessionService,
} from '@coopers/common';

@Injectable()
export class AuthSessionCleanupService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AuthSessionCleanupService.name);
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    void this.revokeExpiredSessions();

    this.cleanupTimer = setInterval(() => {
      void this.revokeExpiredSessions();
    }, this.getCleanupIntervalMs());
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  private async revokeExpiredSessions(): Promise<void> {
    try {
      const revokedCount = await this.sessionService.revokeExpiredSessions();

      if (revokedCount > 0) {
        this.logger.log(`Revoked ${revokedCount} expired auth session(s).`);
      }
    } catch (error) {
      const detail = 'Failed to revoke expired auth sessions.';

      this.logger.error(
        detail,
        error instanceof Error ? error.stack : String(error),
      );
      sendRuntimeAlert({
        category: 'auth-session-cleanup-failure',
        detail,
        error,
        severity: 'error',
        throttleSeconds: 900,
      });
    }
  }

  private getCleanupIntervalMs(): number {
    return (
      getRequiredConfigInteger(
        this.configService,
        'SESSION_CLEANUP_INTERVAL_SECONDS',
      ) * 1000
    );
  }
}
