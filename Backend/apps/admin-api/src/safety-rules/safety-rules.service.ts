import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SafetyRule } from '@coopers/entities';
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

@Injectable()
export class SafetyRulesService {
  constructor(
    @InjectRepository(SafetyRule)
    private readonly safetyRuleRepository: Repository<SafetyRule>,
    private readonly cacheService: CacheService,
  ) {}

  async findAll(
    pagination: PagingReqDto = new PagingReqDto(),
  ): Promise<PaginatedResult<SafetyRule>> {
    const [rules, totalItem] = await this.safetyRuleRepository.findAndCount({
      order: {
        createdAt: 'DESC',
      },
      skip: pagination.skip,
      take: pagination.take,
    });

    return {
      data: rules,
      pagingMeta: new PagingMetaDto(pagination, totalItem),
    };
  }

  async findOne(id: string): Promise<SafetyRule> {
    const safetyRule = await this.safetyRuleRepository.findOne({
      where: { id },
    });

    if (!safetyRule) {
      throw new NotFoundException('Safety rule not found.');
    }

    return safetyRule;
  }

  async create(createSafetyRuleDto: CreateSafetyRuleDto): Promise<SafetyRule> {
    const safetyRule = this.safetyRuleRepository.create({
      ...createSafetyRuleDto,
      condition: normalizeText(createSafetyRuleDto.condition),
      serviceIds: normalizeIdArray(createSafetyRuleDto.serviceIds),
      message: normalizeText(createSafetyRuleDto.message),
    });

    const savedSafetyRule = await this.safetyRuleRepository.save(safetyRule);
    await this.invalidateSafetyRulesCache();

    return savedSafetyRule;
  }

  async update(
    id: string,
    updateSafetyRuleDto: UpdateSafetyRuleDto,
  ): Promise<SafetyRule> {
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

    return savedSafetyRule;
  }

  private invalidateSafetyRulesCache(): Promise<void> {
    return this.cacheService.deleteKey(
      REDIS_CACHE_KEYS.consultation.activeSafetyRules,
    );
  }
}
