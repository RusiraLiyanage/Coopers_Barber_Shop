/// <reference types="jest" />

import { CacheService, REDIS_CACHE_KEYS } from '@coopers/common';
import { SafetyRuleSeverity } from '@coopers/entities';
import { SafetyRulesService } from './safety-rules.service';

describe('SafetyRulesService Redis invalidation', () => {
  const safetyRuleRepository = {
    create: jest.fn(),
    save: jest.fn(),
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

    await service.create({
      condition: 'box dye',
      serviceIds: ['service-1'],
      message: 'Review colour history.',
      severity: SafetyRuleSeverity.HIGH,
    });

    expect(cacheService.deleteKey.mock.calls).toContainEqual([
      REDIS_CACHE_KEYS.consultation.activeSafetyRules,
    ]);
  });
});
