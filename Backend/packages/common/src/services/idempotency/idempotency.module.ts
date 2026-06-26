import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdempotencyKey } from '@coopers/entities';
import { IdempotencyCleanupService } from './idempotency-cleanup.service';
import { IdempotencyService } from './idempotency.service';

@Module({
  imports: [TypeOrmModule.forFeature([IdempotencyKey])],
  providers: [IdempotencyService, IdempotencyCleanupService],
  exports: [IdempotencyService],
})
export class IdempotencyModule {}
