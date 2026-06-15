import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from '@coopers/entities';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';

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

@Injectable()
export class BarbersService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

  findAll(): Promise<Staff[]> {
    return this.staffRepository.find({
      order: {
        displayName: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Staff> {
    const staff = await this.staffRepository.findOne({ where: { id } });

    if (!staff) {
      throw new NotFoundException('Barber not found.');
    }

    return staff;
  }

  async create(createBarberDto: CreateBarberDto): Promise<Staff> {
    const staff = this.staffRepository.create({
      ...createBarberDto,
      displayName: normalizeText(createBarberDto.displayName),
      email: normalizeOptionalText(createBarberDto.email),
      timezone: normalizeOptionalText(createBarberDto.timezone),
      skills: normalizeSkillTags(createBarberDto.skills),
    });

    return this.staffRepository.save(staff);
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

    return this.staffRepository.save(staff);
  }
}
