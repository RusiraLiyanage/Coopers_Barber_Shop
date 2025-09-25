import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { Service } from '../services/entities/service.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { StaffService } from '../staff/staff.service';
import { Staff } from '../staff/entities/staff.entity';

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

  // Booking an appointment -----------------------------------------------------------
  async book(user: { userId: string }, dto: CreateAppointmentDto) {
    const service = await this.servicesRepo.findOneBy({ id: dto.serviceId });
    if (!service) {
      throw new NotFoundException(`Service with ID ${dto.serviceId} not found`);
    }

    // Parse slot into start and end
    const [start, end] = dto.slot.split('-');
    const startAt = new Date(`${dto.date}T${start}:00+10:00`);
    const endAt = new Date(`${dto.date}T${end}:00+10:00`);

    // Check conflicts (existing bookings + buffer)
    const overlap = await this.appointmentsRepo.findOne({
      where: [
        { startAt: Between(startAt, endAt), status: 'booked' },
        { endAt: Between(startAt, endAt), status: 'booked' },
      ],
    });

    // if the time slot fully or partially overlaps with an existing booking, reject it.
    if (overlap) {
      throw new ConflictException(
        `The slot ${dto.slot} on ${dto.date} is already booked`,
      );
    }
    const staff = await this.staffService.getDefaultStaff();

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
    const formatDateTime = (d: Date) =>
      d.toLocaleString('en-AU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Australia/Sydney',
      });

    return {
      id: (await saved).id,
      service: (await saved).service,
      staff: (await saved).staff,
      startAt: formatDateTime((await saved).startAt),
      endAt: formatDateTime((await saved).endAt),
      status: (await saved).status,
    };
  }

  // To show upcoming booked appointments for the login user.
  async findAllForUser(userId: string) {
    const appointments = await this.appointmentsRepo.find({
      where: { customer: { id: userId } },
      relations: ['service', 'staff'],
      order: { startAt: 'ASC' },
    });

    const formatDateTime = (d: Date) =>
      d.toLocaleString('en-AU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Australia/Sydney',
      });

    return appointments.map((appt) => ({
      id: appt.id,
      service: appt.service,
      staff: appt.staff,
      startAt: formatDateTime(appt.startAt),
      endAt: formatDateTime(appt.endAt),
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

    // Service duration and staff buffer time - as defined in the service.
    const serviceDuration = service.durationMinutes;
    const buffer = staff.bufferAfterMinutes;

    // Staff working hours
    const workStart = new Date(`${date}T09:00:00+10:00`); // work start at 9 AM in the morning (timestamped)
    const workEnd = new Date(`${date}T17:00:00+10:00`); // work end at 5 PM in the evening (timestamped)

    // Lunch break with 15 min buffer after - allowing staff a bit of adjustment time.
    const breakStart = new Date(`${date}T12:00:00+10:00`); // break start at 12 PM
    // break end at 1 PM + 15 min buffer time as an adjustment for the staff member.
    const breakEnd = new Date(
      new Date(`${date}T13:00:00+10:00`).getTime() + buffer * 60000, // break + extra buffer time.
    );
    // Existing bookings - retrieve all appointments.
    const appts = await this.appointmentsRepo.find({
      where: { startAt: Between(workStart, workEnd), status: 'booked' },
    });

    const blocked = appts.map((a) => ({
      start: a.startAt,
      end: new Date(a.endAt.getTime() + buffer * 60000),
    }));
    blocked.push({ start: breakStart, end: breakEnd });

    const available: string[] = []; // the empty available slots array to be filled.
    let slotStart = workStart;

    const fmt = (d: Date) =>
      d.toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

    while (slotStart < workEnd) {
      const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);
      if (slotEnd > workEnd) break;

      const overlaps = blocked.some(
        (b) =>
          (slotStart >= b.start && slotStart < b.end) || // slotStart is greater or equals than interval start AND slotStart is less than break end time.
          (slotEnd > b.start && slotEnd <= b.end) || // SlotEnd is greater than break start AND slotEnd is less or equls than break ends.
          (slotStart <= b.start && slotEnd >= b.end), // SlotStart is less or equals than break start AND Slotend is greater or equals than break ends.
      ); // either of these cases, the time slot will be taken overlapping.

      // If no overlap, add to available slots.
      if (!overlaps) {
        console.log(`Slot OK: ${fmt(slotStart)}-${fmt(slotEnd)}`);
        available.push(`${fmt(slotStart)}-${fmt(slotEnd)}`);
        // If overlaps, reject this slot.
      } else {
        console.log(
          `Slot rejected: ${fmt(slotStart)}-${fmt(slotEnd)} (overlaps block)`,
        );
        // If this slot overlaps with lunch, jump to breakEnd
        if (slotStart < breakEnd && slotEnd > breakStart) {
          slotStart = new Date(breakEnd.getTime());
          continue; // skip normal increment
        }
      }

      // Move forward: slotEnd + buffer (normal increment)
      slotStart = new Date(slotEnd.getTime() + buffer * 60000); // add 15 buffer minutes to make sure no back-to-back bookings.
    }

    console.log('--- Final Available Slots ---', available);
    return available;
  }
}
