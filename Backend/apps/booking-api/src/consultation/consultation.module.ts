import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HairHistory, SafetyRule, Service, Staff } from '@coopers/entities';
import { ConsultationController } from './consultation.controller';
import { ConsultationService } from './consultation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Service, Staff, SafetyRule, HairHistory]),
  ],
  controllers: [ConsultationController],
  providers: [ConsultationService],
})
export class ConsultationModule {}
