import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Appointment,
  AppointmentBrief,
  HairHistory,
  Staff,
} from '@coopers/entities';
import { CacheService, REDIS_CACHE_KEYS } from '@coopers/common';
import { PaginatedResult, PagingMetaDto } from '../common/pagination.dto';
import { AdminRealtimeNotifierService } from '../realtime/admin-realtime-notifier.service';
import { BriefsQueryDto } from './dto/briefs-query.dto';
import { CreateBriefDto } from './dto/create-brief.dto';
import { CreateHairHistoryFromBriefDto } from './dto/create-hair-history-from-brief.dto';

interface BriefUserResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface BriefServiceResponse {
  id: string;
  name: string;
  durationMinutes: number;
}

interface BriefStaffResponse {
  id: string;
  displayName: string;
}

interface BriefBookingResponse {
  id: string;
  status: string;
  startAt: Date;
  endAt: Date;
  customer: BriefUserResponse;
  service: BriefServiceResponse;
  staff: BriefStaffResponse;
}

export interface AppointmentBriefResponse {
  id: string;
  booking: BriefBookingResponse;
  barber: Staff | null;
  clientSummary: string;
  safetyNotes: string | null;
  hairState: string[];
  desiredLook: string | null;
  goalPhoto: {
    mediaType: string;
    data: string;
  } | null;
  generationSource: string;
  generationModel: string | null;
  generatedAt: Date;
}

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
    @InjectRepository(HairHistory)
    private readonly hairHistoryRepository: Repository<HairHistory>,
    private readonly cacheService: CacheService,
    @Optional()
    private readonly adminRealtimeNotifier?: AdminRealtimeNotifierService,
  ) {}

  private toBriefResponse(brief: AppointmentBrief): AppointmentBriefResponse {
    return {
      id: brief.id,
      booking: {
        id: brief.booking.id,
        status: brief.booking.status,
        startAt: brief.booking.startAt,
        endAt: brief.booking.endAt,
        customer: {
          id: brief.booking.customer.id,
          email: brief.booking.customer.email,
          firstName: brief.booking.customer.firstName,
          lastName: brief.booking.customer.lastName,
        },
        service: {
          id: brief.booking.service.id,
          name: brief.booking.service.name,
          durationMinutes: brief.booking.service.durationMinutes,
        },
        staff: {
          id: brief.booking.staff.id,
          displayName: brief.booking.staff.displayName,
        },
      },
      barber: brief.barber,
      clientSummary: brief.clientSummary,
      safetyNotes: brief.safetyNotes,
      hairState: brief.hairState,
      desiredLook: brief.desiredLook,
      goalPhoto:
        brief.goalPhotoMediaType && brief.goalPhotoData
          ? {
              mediaType: brief.goalPhotoMediaType,
              data: brief.goalPhotoData,
            }
          : null,
      generationSource: brief.generationSource,
      generationModel: brief.generationModel,
      generatedAt: brief.generatedAt,
    };
  }

  async findAll(
    query: BriefsQueryDto = new BriefsQueryDto(),
  ): Promise<PaginatedResult<AppointmentBriefResponse>> {
    const briefsQuery = this.appointmentBriefRepository
      .createQueryBuilder('brief')
      .leftJoinAndSelect('brief.booking', 'booking')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('booking.service', 'service')
      .leftJoinAndSelect('booking.staff', 'bookingStaff')
      .leftJoinAndSelect('brief.barber', 'barber')
      .orderBy('brief.generatedAt', 'DESC')
      .take(query.take)
      .skip(query.skip);

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

    const [briefs, totalItem] = await briefsQuery.getManyAndCount();

    return {
      data: briefs.map((brief) => this.toBriefResponse(brief)),
      pagingMeta: new PagingMetaDto(query, totalItem),
    };
  }

  async findOne(id: string): Promise<AppointmentBriefResponse> {
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

    return this.toBriefResponse(appointmentBrief);
  }

  async createHairHistoryFromBrief(
    id: string,
    dto: CreateHairHistoryFromBriefDto,
  ): Promise<HairHistory> {
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

    const visitDate =
      dto.visitDate ??
      appointmentBrief.booking.startAt.toISOString().slice(0, 10);
    const hairHistory = this.hairHistoryRepository.create({
      client: appointmentBrief.booking.customer,
      barber: appointmentBrief.barber ?? appointmentBrief.booking.staff,
      service: appointmentBrief.booking.service.name,
      hairState: normalizeStringArray(appointmentBrief.hairState),
      productsUsed: dto.productsUsed?.trim() || null,
      barberNotes: dto.barberNotes?.trim() || null,
      visitDate,
    });

    const savedHistory = await this.hairHistoryRepository.save(hairHistory);
    await this.invalidateClientHairHistoryCache(
      appointmentBrief.booking.customer.id,
    );
    await this.adminRealtimeNotifier?.notifyDataChanged('hair-history');

    return this.hairHistoryRepository.findOneOrFail({
      where: { id: savedHistory.id },
      relations: {
        client: true,
        barber: true,
      },
    });
  }

  private invalidateClientHairHistoryCache(userId: string): Promise<void> {
    return this.cacheService.deleteKey(
      REDIS_CACHE_KEYS.consultation.clientHairHistory(userId),
    );
  }

  async create(
    createBriefDto: CreateBriefDto,
  ): Promise<AppointmentBriefResponse> {
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
    await this.adminRealtimeNotifier?.notifyDataChanged('brief');

    return this.findOne(savedBrief.id);
  }
}
