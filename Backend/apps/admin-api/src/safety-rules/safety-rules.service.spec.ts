/// <reference types="jest" />

import { CacheService, REDIS_CACHE_KEYS } from '@coopers/common';
import { SafetyRuleSeverity } from '@coopers/entities';
import { SafetyRulesService } from './safety-rules.service';

describe('SafetyRulesService Redis invalidation', () => {
  const safetyRuleRepository = {
    create: jest.fn(),
    findAndCount: jest.fn(),
    preload: jest.fn(),
    save: jest.fn(),
  };
  const serviceRepository = {
    find: jest.fn(),
  };
  const cacheService = {
    deleteKey: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears active safety-rule cache after creating a safety rule', async () => {
    const service = new SafetyRulesService(
      safetyRuleRepository as never,
      serviceRepository as never,
      cacheService as unknown as CacheService,
    );
    const safetyRule = {
      id: 'rule-1',
      condition: 'box dye',
      serviceIds: ['service-1'],
      message: 'Review colour history.',
      severity: SafetyRuleSeverity.HIGH,
    };

    safetyRuleRepository.create.mockReturnValue(safetyRule);
    safetyRuleRepository.save.mockResolvedValue(safetyRule);
    serviceRepository.find.mockResolvedValue([
      { id: 'service-1', name: 'Colour correction' },
    ]);

    const result = await service.create({
      condition: 'box dye',
      serviceIds: ['service-1'],
      message: 'Review colour history.',
      severity: SafetyRuleSeverity.HIGH,
    });

    expect(result.services).toEqual([
      { id: 'service-1', name: 'Colour correction' },
    ]);
    expect(cacheService.deleteKey.mock.calls).toContainEqual([
      REDIS_CACHE_KEYS.consultation.activeSafetyRules,
    ]);
  });

  it('clears active safety-rule cache after updating a safety rule', async () => {
    const service = new SafetyRulesService(
      safetyRuleRepository as never,
      serviceRepository as never,
      cacheService as unknown as CacheService,
    );
    const safetyRule = {
      id: 'rule-1',
      condition: 'box dye',
      serviceIds: ['service-1'],
      message: 'Review colour history before chemical service.',
      severity: SafetyRuleSeverity.HIGH,
    };

    safetyRuleRepository.preload.mockResolvedValue(safetyRule);
    safetyRuleRepository.save.mockResolvedValue(safetyRule);
    serviceRepository.find.mockResolvedValue([
      { id: 'service-1', name: 'Colour correction' },
    ]);

    await service.update('rule-1', {
      message: 'Review colour history before chemical service.',
    });

    expect(cacheService.deleteKey.mock.calls).toContainEqual([
      REDIS_CACHE_KEYS.consultation.activeSafetyRules,
    ]);
  });

  it('returns safety rules with linked service names', async () => {
    const service = new SafetyRulesService(
      safetyRuleRepository as never,
      serviceRepository as never,
      cacheService as unknown as CacheService,
    );
    const safetyRule = {
      id: 'rule-1',
      condition: 'box dye',
      serviceIds: ['service-1'],
      message: 'Review colour history.',
      severity: SafetyRuleSeverity.HIGH,
    };

    safetyRuleRepository.findAndCount.mockResolvedValue([[safetyRule], 1]);
    serviceRepository.find.mockResolvedValue([
      { id: 'service-1', name: 'Colour correction' },
    ]);

    const result = await service.findAll({ skip: 0, take: 10 } as never);

    expect(result.data[0].services).toEqual([
      { id: 'service-1', name: 'Colour correction' },
    ]);
  });
});
