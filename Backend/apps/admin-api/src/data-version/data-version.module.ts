import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Appointment,
  AppointmentBrief,
  HairHistory,
  InviteToken,
  ReferenceDataItem,
  SafetyRule,
  Service,
  Staff,
} from '@coopers/entities';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { DataVersionController } from './data-version.controller';
import { DataVersionService } from './data-version.service';

@Module({
  imports: [
    AdminAuthModule,
    TypeOrmModule.forFeature([
      AppointmentBrief,
      Appointment,
      HairHistory,
      InviteToken,
      ReferenceDataItem,
      SafetyRule,
      Service,
      Staff,
    ]),
  ],
  controllers: [DataVersionController],
  providers: [DataVersionService],
  exports: [DataVersionService],
})
export class DataVersionModule {}
