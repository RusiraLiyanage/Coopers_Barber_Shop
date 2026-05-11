import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { Appointment } from './entities/appointment.entity';
import { Service } from '../services/entities/service.entity';
import { StaffModule } from '../staff/staff.module'; // ✅ import StaffModule
import { Staff } from 'src/staff/entities/staff.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, Service, Staff]), // register Appointment, Service, and Staff entities
    StaffModule, // ✅ import StaffModule to use StaffService if needed
  ],
  controllers: [AppointmentsController], // the API endpoints are defined here.
  providers: [AppointmentsService], // the logic for the appointment's APIs are written here.
})
export class AppointmentsModule {}
