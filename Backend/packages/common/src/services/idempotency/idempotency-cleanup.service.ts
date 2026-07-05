import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sendRuntimeAlert } from '../../alerts/runtime-alert';
import { getRequiredConfigInteger } from '../../configs/env.util';
import { IdempotencyService } from './idempotency.service';

@Injectable()
export class IdempotencyCleanupService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(IdempotencyCleanupService.name);
  private cleanupTimer?: ReturnType<typeof setInterval>;

  public constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly configService: ConfigService,
  ) {}

  public onModuleInit(): void {
    void this.deleteExpiredKeys();

    this.cleanupTimer = setInterval(() => {
      void this.deleteExpiredKeys();
    }, this.getCleanupIntervalMs());
  }

  public onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  private async deleteExpiredKeys(): Promise<void> {
    try {
      const deletedCount = await this.idempotencyService.deleteExpired();

      if (deletedCount > 0) {
        this.logger.log(`Deleted ${deletedCount} expired idempotency key(s).`);
      }
    } catch (error) {
      const detail = 'Failed to delete expired idempotency keys.';

      this.logger.error(
        detail,
        error instanceof Error ? error.stack : String(error),
      );
      sendRuntimeAlert({
        category: 'idempotency-cleanup-failure',
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
        'IDEMPOTENCY_KEY_CLEANUP_INTERVAL_SECONDS',
      ) * 1000
    );
  }
}
