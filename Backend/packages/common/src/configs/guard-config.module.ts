import { Module } from '@nestjs/common';
import { GuardConfigService } from './guard.config';

@Module({
  providers: [GuardConfigService],
  exports: [GuardConfigService],
})
export class GuardConfigModule {} // to be imported by the guard module, booking guard app.module
