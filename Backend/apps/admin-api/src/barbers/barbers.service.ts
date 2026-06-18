import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Appointment,
  Staff,
  StaffGender,
  StaffRole,
} from '@coopers/entities';
import {
  PaginatedResult,
  PagingMetaDto,
  PagingReqDto,
} from '../common/pagination.dto';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';

const BOOTSTRAP_STAFF_ID = '11111111-1111-1111-1111-111111111111';
const DEFAULT_BARBER_TIMEZONE = 'Australia/Sydney';

export type DeleteBarberResponse = {
  success: true;
};

function normalizeText(value: string): string {
  return value.trim();
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : undefined;
}

function normalizeSkillTags(
  values: string[] | undefined,
): string[] | undefined {
  if (!values) {
    return undefined;
  }

  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0),
    ),
  );
}

function normalizeRating(value: unknown): number {
  const rating = Number(value);

  return Number.isFinite(rating) ? rating : 0;
}

function normalizeStaffResponse(staff: Staff): Staff {
  return {
    ...staff,
    skills: staff.skills ?? [],
    rating: normalizeRating(staff.rating),
    gender: staff.gender ?? StaffGender.UNSPECIFIED,
    available: staff.available !== false,
    active: staff.active !== false,
  };
}

@Injectable()
export class BarbersService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
  ) {}

  async findAll(
    pagination: PagingReqDto = new PagingReqDto(),
  ): Promise<PaginatedResult<Staff>> {
    const [staff, totalItem] = await this.staffRepository.findAndCount({
      order: {
        displayName: 'ASC',
      },
      skip: pagination.skip,
      take: pagination.take,
    });

    return {
      data: staff.map(normalizeStaffResponse),
      pagingMeta: new PagingMetaDto(pagination, totalItem),
    };
  }

  async findOne(id: string): Promise<Staff> {
    const staff = await this.staffRepository.findOne({ where: { id } });

    if (!staff) {
      throw new NotFoundException('Barber not found.');
    }

    return normalizeStaffResponse(staff);
  }

  async create(createBarberDto: CreateBarberDto): Promise<Staff> {
    const timezone = normalizeOptionalText(createBarberDto.timezone);
    const staff = this.staffRepository.create({
      displayName: normalizeText(createBarberDto.displayName),
      email: normalizeOptionalText(createBarberDto.email),
      role: createBarberDto.role ?? StaffRole.JUNIOR,
      gender: createBarberDto.gender ?? StaffGender.UNSPECIFIED,
      timezone: timezone ?? DEFAULT_BARBER_TIMEZONE,
      skills: normalizeSkillTags(createBarberDto.skills) ?? [],
      rating: createBarberDto.rating ?? 0,
      available: createBarberDto.available ?? true,
      active: createBarberDto.active ?? true,
    });

    const savedStaff = await this.staffRepository.save(staff);

    return normalizeStaffResponse(savedStaff);
  }

  async update(id: string, updateBarberDto: UpdateBarberDto): Promise<Staff> {
    const staff = await this.staffRepository.preload({
      id,
      ...updateBarberDto,
      displayName:
        updateBarberDto.displayName === undefined
          ? undefined
          : normalizeText(updateBarberDto.displayName),
      email: normalizeOptionalText(updateBarberDto.email),
      timezone: normalizeOptionalText(updateBarberDto.timezone),
      skills: normalizeSkillTags(updateBarberDto.skills),
    });

    if (!staff) {
      throw new NotFoundException('Barber not found.');
    }

    const savedStaff = await this.staffRepository.save(staff);

    return normalizeStaffResponse(savedStaff);
  }

  async delete(id: string): Promise<DeleteBarberResponse> {
    const staff = await this.staffRepository.findOne({ where: { id } });

    if (!staff) {
      throw new NotFoundException('Barber not found.');
    }

    if (staff.id === BOOTSTRAP_STAFF_ID) {
      throw new ConflictException('Default booking staff cannot be deleted.');
    }

    const appointmentCount = await this.appointmentRepository.count({
      where: {
        staff: { id },
      },
    });

    if (appointmentCount > 0) {
      throw new ConflictException(
        'This barber has appointments and cannot be deleted.',
      );
    }

    await this.staffRepository.remove(staff);

    return { success: true };
  }
}
