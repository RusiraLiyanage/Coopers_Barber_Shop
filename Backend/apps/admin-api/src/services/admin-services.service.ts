import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from '@coopers/entities';
import {
  PaginatedResult,
  PagingMetaDto,
  PagingReqDto,
} from '../common/pagination.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceAiConfigDto } from './dto/update-service-ai-config.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
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
export class AdminServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,
  ) {}

  async create(createServiceDto: CreateServiceDto): Promise<Service> {
    const name = normalizeName(createServiceDto.name);
    const existingService = await this.findByName(name);

    if (existingService) {
      throw new ConflictException('Service already exists.');
    }

    const service = this.servicesRepository.create({
      name,
      durationMinutes: createServiceDto.durationMinutes,
      requiredSkills: normalizeSkillTags(createServiceDto.requiredSkills) ?? [],
      safetyTriggers: normalizeSkillTags(createServiceDto.safetyTriggers) ?? [],
      complexity: createServiceDto.complexity,
      isActive: createServiceDto.isActive ?? true,
    });

    return this.servicesRepository.save(service);
  }

  async findAll(
    pagination: PagingReqDto = new PagingReqDto(),
  ): Promise<PaginatedResult<Service>> {
    const [services, totalItem] = await this.servicesRepository.findAndCount({
      order: {
        name: 'ASC',
      },
      skip: pagination.skip,
      take: pagination.take,
    });

    return {
      data: services,
      pagingMeta: new PagingMetaDto(pagination, totalItem),
    };
  }

  async findOne(id: string): Promise<Service> {
    const service = await this.servicesRepository.findOne({ where: { id } });

    if (!service) {
      throw new NotFoundException('Service not found.');
    }

    return service;
  }

  async update(
    id: string,
    updateServiceDto: UpdateServiceDto,
  ): Promise<Service> {
    const normalizedName =
      updateServiceDto.name === undefined
        ? undefined
        : normalizeName(updateServiceDto.name);

    if (normalizedName) {
      const existingService = await this.findByName(normalizedName);

      if (existingService && existingService.id !== id) {
        throw new ConflictException('Service already exists.');
      }
    }

    const service = await this.servicesRepository.preload({
      id,
      ...updateServiceDto,
      name: normalizedName,
      requiredSkills: normalizeSkillTags(updateServiceDto.requiredSkills),
      safetyTriggers: normalizeSkillTags(updateServiceDto.safetyTriggers),
    });

    if (!service) {
      throw new NotFoundException('Service not found.');
    }

    return this.servicesRepository.save(service);
  }

  async updateAiConfig(
    id: string,
    updateServiceAiConfigDto: UpdateServiceAiConfigDto,
  ): Promise<Service> {
    const service = await this.servicesRepository.preload({
      id,
      ...updateServiceAiConfigDto,
      requiredSkills: normalizeSkillTags(
        updateServiceAiConfigDto.requiredSkills,
      ),
      safetyTriggers: normalizeSkillTags(
        updateServiceAiConfigDto.safetyTriggers,
      ),
    });

    if (!service) {
      throw new NotFoundException('Service not found.');
    }

    return this.servicesRepository.save(service);
  }

  private findByName(name: string): Promise<Service | null> {
    return this.servicesRepository.findOne({
      where: {
        name,
      },
    });
  }
}
