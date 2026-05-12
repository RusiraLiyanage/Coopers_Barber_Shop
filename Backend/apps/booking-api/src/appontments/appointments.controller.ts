import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Req,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import type { JwtAuthenticatedRequest } from '../auth/auth.types';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // Book appointment
  @UseGuards(JwtAuthGuard)
  @Post()
  async book(
    @Request() req: JwtAuthenticatedRequest,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.book(req.user, dto);
  }

  // My bookings
  // Protect with JWT so only logged-in users see their own bookings
  @UseGuards(JwtAuthGuard)
  @Get('all')
  async getAllAppointments(@Req() req: JwtAuthenticatedRequest) {
    return this.appointmentsService.findAllForUser(req.user.userId);
  }

  // Availability
  @UseGuards(JwtAuthGuard)
  @Get('availability')
  getAvailability(@Query() query: AvailabilityQueryDto) {
    return this.appointmentsService.getAvailability(
      query.serviceId,
      query.date,
    );
  }
}
