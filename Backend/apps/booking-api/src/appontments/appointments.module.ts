import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { Appointment, AppointmentBrief, HairHistory } from '@coopers/entities';
import { Service } from '@coopers/entities';
import { StaffModule } from '../staff/staff.module'; // ✅ import StaffModule
import { Staff } from '@coopers/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      AppointmentBrief,
      HairHistory,
      Service,
      Staff,
    ]), // register appointment-related entities
    StaffModule, // import StaffModule to use StaffService if needed
  ],
  controllers: [AppointmentsController], // the API endpoints are defined here.
  providers: [AppointmentsService], // the logic for the appointment's APIs are written here.
})
export class AppointmentsModule {}
