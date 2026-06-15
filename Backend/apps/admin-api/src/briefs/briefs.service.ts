import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, AppointmentBrief, Staff } from '@coopers/entities';
import { BriefsQueryDto } from './dto/briefs-query.dto';
import { CreateBriefDto } from './dto/create-brief.dto';

function normalizeStringArray(values: string[]): string[] {
  return Array.from(
    new Set(
      values.map((value) => value.trim()).filter((value) => value.length > 0),
    ),
  );
}

@Injectable()
export class BriefsService {
  constructor(
    @InjectRepository(AppointmentBrief)
    private readonly appointmentBriefRepository: Repository<AppointmentBrief>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

  findAll(query: BriefsQueryDto = {}): Promise<AppointmentBrief[]> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const briefsQuery = this.appointmentBriefRepository
      .createQueryBuilder('brief')
      .leftJoinAndSelect('brief.booking', 'booking')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('booking.service', 'service')
      .leftJoinAndSelect('booking.staff', 'bookingStaff')
      .leftJoinAndSelect('brief.barber', 'barber')
      .orderBy('brief.generatedAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (query.barberId) {
      briefsQuery.andWhere('barber.id = :barberId', {
        barberId: query.barberId,
      });
    }

    if (query.date) {
      briefsQuery.andWhere('DATE(booking.startAt) = :date', {
        date: query.date,
      });
    }

    if (query.hasSafetyNotes === 'true') {
      briefsQuery.andWhere('brief.safetyNotes IS NOT NULL');
    }

    if (query.hasSafetyNotes === 'false') {
      briefsQuery.andWhere('brief.safetyNotes IS NULL');
    }

    return briefsQuery.getMany();
  }

  async findOne(id: string): Promise<AppointmentBrief> {
    const appointmentBrief = await this.appointmentBriefRepository.findOne({
      where: { id },
      relations: {
        booking: {
          customer: true,
          service: true,
          staff: true,
        },
        barber: true,
      },
    });

    if (!appointmentBrief) {
      throw new NotFoundException('Appointment brief not found.');
    }

    return appointmentBrief;
  }

  async create(createBriefDto: CreateBriefDto): Promise<AppointmentBrief> {
    const booking = await this.appointmentRepository.findOne({
      where: { id: createBriefDto.bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Appointment booking not found.');
    }

    const barber = createBriefDto.barberId
      ? await this.staffRepository.findOne({
          where: { id: createBriefDto.barberId },
        })
      : null;

    if (createBriefDto.barberId && !barber) {
      throw new NotFoundException('Barber not found.');
    }

    const appointmentBrief = this.appointmentBriefRepository.create({
      booking,
      barber,
      clientSummary: createBriefDto.clientSummary.trim(),
      safetyNotes: createBriefDto.safetyNotes?.trim() || null,
      hairState: normalizeStringArray(createBriefDto.hairState),
      desiredLook: createBriefDto.desiredLook?.trim() || null,
    });

    const savedBrief =
      await this.appointmentBriefRepository.save(appointmentBrief);

    return this.findOne(savedBrief.id);
  }
}
