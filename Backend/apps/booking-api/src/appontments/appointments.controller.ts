import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Request,
  Req,
} from '@nestjs/common';
import { IdempotencyInterceptor } from '@coopers/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import type { JwtAuthenticatedRequest } from '../auth/auth.types';

@ApiTags('appointments')
@ApiBearerAuth('access-token')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // Book appointment
  @ApiOperation({ summary: 'Book an appointment' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Unique key for this booking attempt.',
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Post()
  async book(
    @Request() req: JwtAuthenticatedRequest,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.book(req.user, dto);
  }

  @ApiOperation({ summary: 'Update appointment date and time' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Unique key for this appointment update attempt.',
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Patch(':id')
  async updateAppointmentTime(
    @Request() req: JwtAuthenticatedRequest,
    @Param('id') appointmentId: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.updateAppointmentTime(
      req.user,
      appointmentId,
      dto,
    );
  }

  @ApiOperation({ summary: 'Cancel an appointment' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Unique key for this appointment cancellation attempt.',
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Patch(':id/cancel')
  async cancelAppointment(
    @Request() req: JwtAuthenticatedRequest,
    @Param('id') appointmentId: string,
  ) {
    return this.appointmentsService.cancelAppointment(req.user, appointmentId);
  }

  // My bookings
  // Protect with JWT so only logged-in users see their own bookings
  @ApiOperation({ summary: 'Get appointments for the authenticated user' })
  @UseGuards(JwtAuthGuard)
  @Get('all')
  async getAllAppointments(@Req() req: JwtAuthenticatedRequest) {
    return this.appointmentsService.findAllForUser(req.user.userId);
  }

  // Availability
  @ApiOperation({ summary: 'Get available appointment slots' })
  @UseGuards(JwtAuthGuard)
  @Get('availability')
  getAvailability(@Query() query: AvailabilityQueryDto) {
    return this.appointmentsService.getAvailability(
      query.serviceId,
      query.date,
      query.staffId,
      query.excludeAppointmentId,
    );
  }
}
