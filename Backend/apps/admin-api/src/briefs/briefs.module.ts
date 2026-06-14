import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentBrief } from '@coopers/entities';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { BriefsController } from './briefs.controller';
import { BriefsService } from './briefs.service';

@Module({
  imports: [AdminAuthModule, TypeOrmModule.forFeature([AppointmentBrief])],
  controllers: [BriefsController],
  providers: [BriefsService],
})
export class BriefsModule {}
