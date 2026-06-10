import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Appointment, Service, Staff } from '@coopers/entities';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { StaffService } from '../staff/staff.service';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';

const WORKDAY_START = '09:00';
const WORKDAY_END = '17:00';
const LUNCH_START = '12:00';
const LUNCH_END = '13:00';

interface BookingUser {
  userId: string;
}

interface TimeInterval {
  start: Date;
  end: Date;
}

interface AppointmentIntervalRow {
  startAt: Date;
  endAt: Date;
}

interface StaffSchedule {
  workStart: Date;
  workEnd: Date;
  breaks: TimeInterval[];
}

interface StaffScheduleInput {
  timezone: string;
  bufferAfterMinutes: number;
}

interface BlockedIntervalStaffInput {
  id: string;
  bufferAfterMinutes: number;
}

interface AvailabilityServiceInput {
  durationMinutes: number;
}

interface AvailabilityStaffInput {
  id: string;
  timezone: string;
  bufferAfterMinutes: number;
}

interface AppointmentResponseInput {
  id: string;
  service: { id: string; name: string };
  staff: { id: string; displayName: string };
  startAt: Date;
  endAt: Date;
  status: string;
}

export interface AppointmentResponse {
  id: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  startAt: string;
  endAt: string;
  status: string;
}

@Injectable()
export class AppointmentsService {
  constructor(
    @Inject(getRepositoryToken(Appointment as EntityClassOrSchema))
    private appointmentsRepo: Repository<Appointment>,
    @Inject(getRepositoryToken(Service as EntityClassOrSchema))
    private servicesRepo: Repository<Service>,
    private staffService: StaffService,
    @Inject(getRepositoryToken(Staff as EntityClassOrSchema))
    private staffRepo: Repository<Staff>,
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

    const match: RegExpMatchArray | null = offsetName.match(
      /^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/,
    );
    if (!match) {
      throw new BadRequestException(
        `Unsupported timezone offset: ${offsetName}`,
      );
    }

    const sign: string | undefined = match[1];
    const hours: string | undefined = match[2];
    const minutes: string = match[3] ?? '0';
    if (!sign || !hours) {
      throw new BadRequestException(
        `Unsupported timezone offset: ${offsetName}`,
      );
    }

    const totalMinutes =
      Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10);

    return sign === '+' ? totalMinutes : -totalMinutes;
  }

  private parseDateParts(date: string): [number, number, number] {
    const parts: string[] = date.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      parts.length !== 3
    ) {
      throw new BadRequestException('Invalid date format');
    }

    return [year, month, day];
  }

  private parseTimeParts(time: string): [number, number] {
    const parts: string[] = time.split(':');
    const hour = Number(parts[0]);
    const minute = Number(parts[1]);

    if (
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      parts.length !== 2
    ) {
      throw new BadRequestException('Invalid time format');
    }

    return [hour, minute];
  }

  private toStaffDateTime(date: string, time: string, timeZone: string): Date {
    const [year, month, day] = this.parseDateParts(date);
    const [hour, minute] = this.parseTimeParts(time);

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

  private formatDate(date: Date, timeZone: string): string {
    const parts = new Intl.DateTimeFormat('en-AU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone,
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    if (!year || !month || !day) {
      throw new BadRequestException('Unable to resolve appointment date');
    }

    return `${year}-${month}-${day}`;
  }

  private getAppointmentTimesForSlot(
    date: string,
    slot: string,
    timeZone: string,
  ): { startAt: Date; endAt: Date } {
    const [start, end] = slot.split('-');
    if (!start || !end) {
      throw new BadRequestException('Invalid slot format');
    }

    return {
      startAt: this.toStaffDateTime(date, start, timeZone),
      endAt: this.toStaffDateTime(date, end, timeZone),
    };
  }

  private toAppointmentResponse(
    appointment: AppointmentResponseInput,
    timeZone: string,
  ): AppointmentResponse {
    const { id, service, staff, startAt, endAt, status } = appointment;

    if (!service || !staff) {
      throw new BadRequestException('Appointment is missing service or staff');
    }

    return {
      id,
      serviceId: service.id,
      serviceName: service.name,
      staffId: staff.id,
      staffName: staff.displayName,
      startAt: this.formatDateTime(startAt, timeZone),
      endAt: this.formatDateTime(endAt, timeZone),
      status,
    };
  }

  private getStaffScheduleForDate(
    staff: StaffScheduleInput,
    date: string,
  ): StaffSchedule | null {
    const weekday = this.getWeekdayNumber(date);
    if (weekday > 5) {
      return null;
    }

    const { timezone, bufferAfterMinutes } = staff;
    const workStart = this.toStaffDateTime(date, WORKDAY_START, timezone);
    const workEnd = this.toStaffDateTime(date, WORKDAY_END, timezone);
    const lunchStart = this.toStaffDateTime(date, LUNCH_START, timezone);
    const lunchEndWithBuffer = this.addMinutes(
      this.toStaffDateTime(date, LUNCH_END, timezone),
      bufferAfterMinutes,
    );

    return {
      workStart,
      workEnd,
      breaks: [{ start: lunchStart, end: lunchEndWithBuffer }],
    };
  }

  private async getBlockedIntervals(
    staff: BlockedIntervalStaffInput,
    workStart: Date,
    workEnd: Date,
    excludeAppointmentId?: string,
  ): Promise<TimeInterval[]> {
    const { id: staffId, bufferAfterMinutes } = staff;
    const appointmentsQueryBuilder = this.appointmentsRepo
      .createQueryBuilder('appointment')
      .select('appointment.startAt', 'startAt')
      .addSelect('appointment.endAt', 'endAt')
      .innerJoin('appointment.staff', 'staff')
      .where('staff.id = :staffId', { staffId })
      .andWhere('appointment.status = :status', { status: 'booked' });

    if (excludeAppointmentId) {
      appointmentsQueryBuilder.andWhere(
        'appointment.id != :excludeAppointmentId',
        { excludeAppointmentId },
      );
    }

    const appointmentIntervals =
      await appointmentsQueryBuilder.getRawMany<AppointmentIntervalRow>();

    const blockedIntervals: TimeInterval[] = appointmentIntervals.map(
      (interval: AppointmentIntervalRow): TimeInterval => ({
        start: interval.startAt,
        end: this.addMinutes(interval.endAt, bufferAfterMinutes),
      }),
    );

    return blockedIntervals.filter((interval: TimeInterval): boolean =>
      this.rangesOverlap(interval.start, interval.end, workStart, workEnd),
    );
  }

  private async calculateAvailability(
    service: AvailabilityServiceInput,
    staff: AvailabilityStaffInput,
    date: string,
    excludeAppointmentId?: string,
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
        excludeAppointmentId,
      )),
      ...schedule.breaks,
    ].sort(
      (left: TimeInterval, right: TimeInterval): number =>
        left.start.getTime() - right.start.getTime(),
    );

    const available: string[] = [];
    let slotStart = new Date(schedule.workStart);

    while (slotStart < schedule.workEnd) {
      const slotEnd = this.addMinutes(slotStart, service.durationMinutes);
      const slotEndWithBuffer = this.addMinutes(
        slotEnd,
        staff.bufferAfterMinutes,
      );
      if (slotEnd > schedule.workEnd) {
        break;
      }

      const overlappingIntervals: TimeInterval[] = blocked.filter(
        (interval: TimeInterval): boolean =>
          this.rangesOverlap(
            slotStart,
            slotEndWithBuffer,
            interval.start,
            interval.end,
          ),
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
        (latestEnd: Date, interval: TimeInterval): Date =>
          interval.end > latestEnd ? interval.end : latestEnd,
        overlappingIntervals[0].end,
      );

      slotStart = new Date(nextAvailableStart);
    }

    return available;
  }

  // Booking an appointment -----------------------------------------------------------
  async book(
    user: BookingUser,
    dto: CreateAppointmentDto,
  ): Promise<AppointmentResponse> {
    const service: Service | null = await this.servicesRepo.findOneBy({
      id: dto.serviceId,
    });
    if (!service) {
      throw new NotFoundException(`Service with ID ${dto.serviceId} not found`);
    }

    const staff: Staff = await this.staffService.getDefaultStaff();
    const availableSlots: string[] = await this.calculateAvailability(
      service,
      staff,
      dto.date,
    );

    if (!availableSlots.includes(dto.slot)) {
      throw new ConflictException(
        `The slot ${dto.slot} on ${dto.date} is not available`,
      );
    }

    const { startAt, endAt } = this.getAppointmentTimesForSlot(
      dto.date,
      dto.slot,
      staff.timezone,
    );

    const appointmentInput: DeepPartial<Appointment> = {
      customer: { id: user.userId },
      service,
      staff,
      startAt,
      endAt,
      status: 'booked',
    };

    const appointment: Appointment =
      this.appointmentsRepo.create(appointmentInput);
    const saved: Appointment = await this.appointmentsRepo.save(appointment);

    return this.toAppointmentResponse(saved, staff.timezone);
  }

  // To show appointment history for the login user.
  async findAllForUser(userId: string): Promise<AppointmentResponse[]> {
    const appointments = await this.appointmentsRepo.find({
      where: { customer: { id: userId } },
      relations: ['service', 'staff'],
      order: { startAt: 'DESC' },
    });

    const staff = await this.staffService.getDefaultStaff();

    return appointments.map(
      (appointment: AppointmentResponseInput): AppointmentResponse =>
        this.toAppointmentResponse(appointment, staff.timezone),
    );
  }

  // To get a list of available time slots for a specific service on a given date.
  async getAvailability(
    serviceId: string,
    date: string,
    excludeAppointmentId?: string,
  ): Promise<string[]> {
    // retrieve service details based on the service id.
    const service = await this.servicesRepo.findOneBy({ id: serviceId });
    if (!service) throw new BadRequestException('Service not found');

    // For simplicity, assign all bookings to the first staff member found. (the only staff member)
    const staff = await this.staffRepo.findOne({ where: {} });
    if (!staff) throw new BadRequestException('No staff available');

    return this.calculateAvailability(
      service,
      staff,
      date,
      excludeAppointmentId,
    );
  }

  async updateAppointmentTime(
    user: BookingUser,
    appointmentId: string,
    dto: UpdateAppointmentDto,
  ): Promise<AppointmentResponse> {
    const appointment = await this.appointmentsRepo.findOne({
      where: {
        id: appointmentId,
        customer: { id: user.userId },
      },
      relations: ['service', 'staff'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status !== 'booked') {
      throw new BadRequestException('Only booked appointments can be updated');
    }

    const availableSlots = await this.calculateAvailability(
      appointment.service,
      appointment.staff,
      dto.date,
      appointment.id,
    );

    if (!availableSlots.includes(dto.slot)) {
      throw new ConflictException(`The slot ${dto.slot} is not available`);
    }

    const { startAt, endAt } = this.getAppointmentTimesForSlot(
      dto.date,
      dto.slot,
      appointment.staff.timezone,
    );

    appointment.startAt = startAt;
    appointment.endAt = endAt;

    const saved = await this.appointmentsRepo.save(appointment);

    return this.toAppointmentResponse(saved, appointment.staff.timezone);
  }

  async cancelAppointment(
    user: BookingUser,
    appointmentId: string,
  ): Promise<AppointmentResponse> {
    const appointment = await this.appointmentsRepo.findOne({
      where: {
        id: appointmentId,
        customer: { id: user.userId },
      },
      relations: ['service', 'staff'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status !== 'booked') {
      throw new BadRequestException(
        'Only booked appointments can be cancelled',
      );
    }

    appointment.status = 'cancelled_by_client';

    const saved = await this.appointmentsRepo.save(appointment);

    return this.toAppointmentResponse(saved, appointment.staff.timezone);
  }
}
