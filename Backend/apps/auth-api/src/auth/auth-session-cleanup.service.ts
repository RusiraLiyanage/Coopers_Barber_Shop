import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionService } from '@coopers/common';

const DEFAULT_SESSION_CLEANUP_INTERVAL_SECONDS = 60;

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
      this.logger.error(
        'Failed to revoke expired auth sessions.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private getCleanupIntervalMs(): number {
    const configuredIntervalSeconds = Number(
      this.configService.get<string>('SESSION_CLEANUP_INTERVAL_SECONDS') ??
        DEFAULT_SESSION_CLEANUP_INTERVAL_SECONDS,
    );
    const intervalSeconds =
      Number.isFinite(configuredIntervalSeconds) &&
      configuredIntervalSeconds > 0
        ? configuredIntervalSeconds
        : DEFAULT_SESSION_CLEANUP_INTERVAL_SECONDS;

    return Math.floor(intervalSeconds) * 1000;
  }
}
