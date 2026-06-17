import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment, Staff } from '@coopers/entities';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { BarbersController } from './barbers.controller';
import { BarbersService } from './barbers.service';

@Module({
  imports: [AdminAuthModule, TypeOrmModule.forFeature([Appointment, Staff])],
  controllers: [BarbersController],
  providers: [BarbersService],
})
export class BarbersModule {}
