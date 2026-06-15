import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment, AppointmentBrief, Staff } from '@coopers/entities';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { BriefsController } from './briefs.controller';
import { BriefsService } from './briefs.service';

@Module({
  imports: [
    AdminAuthModule,
    TypeOrmModule.forFeature([AppointmentBrief, Appointment, Staff]),
  ],
  controllers: [BriefsController],
  providers: [BriefsService],
})
export class BriefsModule {}
