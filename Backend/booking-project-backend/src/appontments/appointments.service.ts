import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { Service } from '../services/entities/service.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { StaffService } from '../staff/staff.service';
import { Staff } from '../staff/entities/staff.entity';

const WORKDAY_START = '09:00';
const WORKDAY_END = '17:00';
const LUNCH_START = '12:00';
const LUNCH_END = '13:00';
@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentsRepo: Repository<Appointment>,
    @InjectRepository(Service)
    private servicesRepo: Repository<Service>,
    private staffService: StaffService,
    @InjectRepository(Staff) private staffRepo: Repository<Staff>,
  ) {}

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
  }

  private rangesOverlap(
    startA: Date,
    endA: Date,
    startB: Date,
    endB: Date,
  ): boolean {
    return startA < endB && startB < endA;
  }

  private getWeekdayNumber(date: string): number {
    const jsDay = new Date(`${date}T00:00:00Z`).getUTCDay();
    return jsDay === 0 ? 7 : jsDay;
  }

  private getTimeZoneOffsetMinutes(timeZone: string, instant: Date): number {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(instant);

    const offsetName = parts.find(
      (part) => part.type === 'timeZoneName',
    )?.value;

    if (!offsetName || offsetName === 'GMT') {
      return 0;
    }

    const match = offsetName.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
    if (!match) {
      throw new BadRequestException(
        `Unsupported timezone offset: ${offsetName}`,
      );
    }

    const [, sign, hours, minutes] = match;
    const totalMinutes =
      parseInt(hours, 10) * 60 + parseInt(minutes ?? '0', 10);

    return sign === '+' ? totalMinutes : -totalMinutes;
  }

  private toStaffDateTime(date: string, time: string, timeZone: string): Date {
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);

    const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
    const offsetAtGuess = this.getTimeZoneOffsetMinutes(timeZone, utcGuess);
    const instant = new Date(
      Date.UTC(year, month - 1, day, hour, minute) - offsetAtGuess * 60000,
    );
    const correctedOffset = this.getTimeZoneOffsetMinutes(timeZone, instant);

    if (correctedOffset === offsetAtGuess) {
      return instant;
    }

    return new Date(
      Date.UTC(year, month - 1, day, hour, minute) - correctedOffset * 60000,
    );
  }

  private formatTime(date: Date, timeZone: string): string {
    return date.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    });
  }

  private formatDateTime(date: Date, timeZone: string): string {
    return date.toLocaleString('en-AU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    });
  }

  private getStaffScheduleForDate(staff: Staff, date: string) {
    const weekday = this.getWeekdayNumber(date);
    if (weekday > 5) {
      return null;
    }

    const workStart = this.toStaffDateTime(date, WORKDAY_START, staff.timezone);
    const workEnd = this.toStaffDateTime(date, WORKDAY_END, staff.timezone);
    const lunchStart = this.toStaffDateTime(date, LUNCH_START, staff.timezone);
    const lunchEndWithBuffer = this.addMinutes(
      this.toStaffDateTime(date, LUNCH_END, staff.timezone),
      staff.bufferAfterMinutes,
    );

    return {
      workStart,
      workEnd,
      breaks: [{ start: lunchStart, end: lunchEndWithBuffer }],
    };
  }

  private async getBlockedIntervals(
    staff: Staff,
    workStart: Date,
    workEnd: Date,
  ) {
    const appointments = await this.appointmentsRepo.find({
      where: {
        staff: { id: staff.id },
        status: 'booked',
      },
    });

    return appointments
      .map((appointment) => ({
        start: appointment.startAt,
        end: this.addMinutes(appointment.endAt, staff.bufferAfterMinutes),
      }))
      .filter((interval) =>
        this.rangesOverlap(interval.start, interval.end, workStart, workEnd),
      );
  }

  private async calculateAvailability(
    service: Service,
    staff: Staff,
    date: string,
  ): Promise<string[]> {
    const schedule = this.getStaffScheduleForDate(staff, date);
    if (!schedule) {
      return [];
    }

    const blocked = [
      ...(await this.getBlockedIntervals(
        staff,
        schedule.workStart,
        schedule.workEnd,
      )),
      ...schedule.breaks,
    ].sort((left, right) => left.start.getTime() - right.start.getTime());

    const available: string[] = [];
    let slotStart = new Date(schedule.workStart);

    while (slotStart < schedule.workEnd) {
      const slotEnd = this.addMinutes(slotStart, service.durationMinutes);
      if (slotEnd > schedule.workEnd) {
        break;
      }

      const overlappingIntervals = blocked.filter((interval) =>
        this.rangesOverlap(slotStart, slotEnd, interval.start, interval.end),
      );

      if (overlappingIntervals.length === 0) {
        available.push(
          `${this.formatTime(slotStart, staff.timezone)}-${this.formatTime(
            slotEnd,
            staff.timezone,
          )}`,
        );
        slotStart = this.addMinutes(slotEnd, staff.bufferAfterMinutes);
        continue;
      }

      const nextAvailableStart = overlappingIntervals.reduce(
        (latestEnd, interval) =>
          interval.end > latestEnd ? interval.end : latestEnd,
        overlappingIntervals[0].end,
      );

      slotStart = new Date(nextAvailableStart);
    }

    return available;
  }

  // Booking an appointment -----------------------------------------------------------
  async book(user: { userId: string }, dto: CreateAppointmentDto) {
    const service = await this.servicesRepo.findOneBy({ id: dto.serviceId });
    if (!service) {
      throw new NotFoundException(`Service with ID ${dto.serviceId} not found`);
    }

    const staff = await this.staffService.getDefaultStaff();
    const availableSlots = await this.calculateAvailability(
      service,
      staff,
      dto.date,
    );

    if (!availableSlots.includes(dto.slot)) {
      throw new ConflictException(
        `The slot ${dto.slot} on ${dto.date} is not available`,
      );
    }

    // Parse slot into start and end
    const [start, end] = dto.slot.split('-');
    if (!start || !end) {
      throw new BadRequestException('Invalid slot format');
    }
    const startAt = this.toStaffDateTime(dto.date, start, staff.timezone);
    const endAt = this.toStaffDateTime(dto.date, end, staff.timezone);

    // Save booking
    const appointment = this.appointmentsRepo.create({
      customer: { id: user.userId },
      service,
      staff,
      startAt,
      endAt,
      status: 'booked',
    });

    const saved = this.appointmentsRepo.save(appointment);

    // Format startAt / endAt before returning
    return {
      id: (await saved).id,
      service: (await saved).service,
      staff: (await saved).staff,
      startAt: this.formatDateTime((await saved).startAt, staff.timezone),
      endAt: this.formatDateTime((await saved).endAt, staff.timezone),
      status: (await saved).status,
    };
  }

  // To show upcoming booked appointments for the login user.
  async findAllForUser(userId: string) {
    const appointments = await this.appointmentsRepo.find({
      where: { customer: { id: userId } },
      relations: ['service', 'staff'],
      order: { startAt: 'DESC' },
    });

    const staff = await this.staffService.getDefaultStaff();

    return appointments.map((appt) => ({
      id: appt.id,
      service: appt.service,
      staff: appt.staff,
      startAt: this.formatDateTime(appt.startAt, staff.timezone),
      endAt: this.formatDateTime(appt.endAt, staff.timezone),
      status: appt.status,
    }));
  }

  // To get a list of available time slots for a specific service on a given date.
  async getAvailability(serviceId: string, date: string) {
    // retrieve service details based on the service id.
    const service = await this.servicesRepo.findOneBy({ id: serviceId });
    if (!service) throw new BadRequestException('Service not found');

    // For simplicity, assign all bookings to the first staff member found. (the only staff member)
    const staff = await this.staffRepo.findOne({ where: {} });
    if (!staff) throw new BadRequestException('No staff available');

    return this.calculateAvailability(service, staff, date);
  }
}
