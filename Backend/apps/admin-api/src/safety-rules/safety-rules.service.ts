import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SafetyRule, Service } from '@coopers/entities';
import { CacheService, REDIS_CACHE_KEYS } from '@coopers/common';
import {
  PaginatedResult,
  PagingMetaDto,
  PagingReqDto,
} from '../common/pagination.dto';
import { CreateSafetyRuleDto } from './dto/create-safety-rule.dto';
import { UpdateSafetyRuleDto } from './dto/update-safety-rule.dto';

function normalizeText(value: string): string {
  return value.trim();
}

function normalizeIdArray(values: string[]): string[] {
  return Array.from(
    new Set(
      values.map((value) => value.trim()).filter((value) => value.length > 0),
    ),
  );
}

export type SafetyRuleServiceSummary = {
  id: string;
  name: string;
};

export type SafetyRuleResponse = SafetyRule & {
  services: SafetyRuleServiceSummary[];
};

@Injectable()
export class SafetyRulesService {
  constructor(
    @InjectRepository(SafetyRule)
    private readonly safetyRuleRepository: Repository<SafetyRule>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    private readonly cacheService: CacheService,
  ) {}

  async findAll(
    pagination: PagingReqDto = new PagingReqDto(),
  ): Promise<PaginatedResult<SafetyRuleResponse>> {
    const [rules, totalItem] = await this.safetyRuleRepository.findAndCount({
      order: {
        createdAt: 'DESC',
      },
      skip: pagination.skip,
      take: pagination.take,
    });

    return {
      data: await this.attachServices(rules),
      pagingMeta: new PagingMetaDto(pagination, totalItem),
    };
  }

  async findOne(id: string): Promise<SafetyRuleResponse> {
    const safetyRule = await this.safetyRuleRepository.findOne({
      where: { id },
    });

    if (!safetyRule) {
      throw new NotFoundException('Safety rule not found.');
    }

    return this.attachServicesToRule(safetyRule);
  }

  async create(
    createSafetyRuleDto: CreateSafetyRuleDto,
  ): Promise<SafetyRuleResponse> {
    const safetyRule = this.safetyRuleRepository.create({
      ...createSafetyRuleDto,
      condition: normalizeText(createSafetyRuleDto.condition),
      serviceIds: normalizeIdArray(createSafetyRuleDto.serviceIds),
      message: normalizeText(createSafetyRuleDto.message),
    });

    const savedSafetyRule = await this.safetyRuleRepository.save(safetyRule);
    await this.invalidateSafetyRulesCache();

    return this.attachServicesToRule(savedSafetyRule);
  }

  async update(
    id: string,
    updateSafetyRuleDto: UpdateSafetyRuleDto,
  ): Promise<SafetyRuleResponse> {
    const safetyRule = await this.safetyRuleRepository.preload({
      id,
      ...updateSafetyRuleDto,
      condition:
        updateSafetyRuleDto.condition === undefined
          ? undefined
          : normalizeText(updateSafetyRuleDto.condition),
      serviceIds:
        updateSafetyRuleDto.serviceIds === undefined
          ? undefined
          : normalizeIdArray(updateSafetyRuleDto.serviceIds),
      message:
        updateSafetyRuleDto.message === undefined
          ? undefined
          : normalizeText(updateSafetyRuleDto.message),
    });

    if (!safetyRule) {
      throw new NotFoundException('Safety rule not found.');
    }

    const savedSafetyRule = await this.safetyRuleRepository.save(safetyRule);
    await this.invalidateSafetyRulesCache();

    return this.attachServicesToRule(savedSafetyRule);
  }

  private invalidateSafetyRulesCache(): Promise<void> {
    return this.cacheService.deleteKey(
      REDIS_CACHE_KEYS.consultation.activeSafetyRules,
    );
  }

  private async attachServicesToRule(
    rule: SafetyRule,
  ): Promise<SafetyRuleResponse> {
    const [ruleWithServices] = await this.attachServices([rule]);

    return ruleWithServices;
  }

  private async attachServices(
    rules: SafetyRule[],
  ): Promise<SafetyRuleResponse[]> {
    const serviceIds = Array.from(
      new Set(rules.flatMap((rule) => rule.serviceIds)),
    );

    if (serviceIds.length === 0) {
      return rules.map((rule) => ({
        ...rule,
        services: [],
      }));
    }

    const services = await this.serviceRepository.find({
      select: {
        id: true,
        name: true,
      },
      where: {
        id: In(serviceIds),
      },
    });
    const serviceNameById = new Map(
      services.map((service) => [service.id, service.name] as const),
    );

    return rules.map((rule) => ({
      ...rule,
      services: rule.serviceIds
        .map((serviceId) => {
          const serviceName = serviceNameById.get(serviceId);

          return serviceName
            ? {
                id: serviceId,
                name: serviceName,
              }
            : null;
        })
        .filter((service): service is SafetyRuleServiceSummary =>
          Boolean(service),
        ),
    }));
  }
}
