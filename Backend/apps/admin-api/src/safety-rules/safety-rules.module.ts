import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SafetyRule, Service } from '@coopers/entities';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { SafetyRulesController } from './safety-rules.controller';
import { SafetyRulesService } from './safety-rules.service';

@Module({
  imports: [AdminAuthModule, TypeOrmModule.forFeature([SafetyRule, Service])],
  controllers: [SafetyRulesController],
  providers: [SafetyRulesService],
})
export class SafetyRulesModule {}
