/// <reference types="jest" />

import { CacheService, REDIS_CACHE_KEYS } from '@coopers/common';
import { ServiceComplexity } from '@coopers/entities';
import { AdminServicesService } from './admin-services.service';

describe('AdminServicesService Redis invalidation', () => {
  const servicesRepository = {
    create: jest.fn(),
    findOne: jest.fn(),
    preload: jest.fn(),
    save: jest.fn(),
  };
  const cacheService = {
    deleteKey: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears service and safety-rule cache after creating a service', async () => {
    const service = new AdminServicesService(
      servicesRepository as never,
      cacheService as unknown as CacheService,
    );
    const savedService = {
      id: 'service-1',
      name: 'Colour Correction',
      durationMinutes: 60,
      complexity: ServiceComplexity.HIGH,
    };

    servicesRepository.findOne.mockResolvedValue(null);
    servicesRepository.create.mockReturnValue(savedService);
    servicesRepository.save.mockResolvedValue(savedService);

    await service.create({
      name: 'Colour Correction',
      durationMinutes: 60,
      complexity: ServiceComplexity.HIGH,
    });

    expect(cacheService.deleteKey.mock.calls).toEqual(
      expect.arrayContaining([
        [REDIS_CACHE_KEYS.consultation.activeService('service-1')],
        [REDIS_CACHE_KEYS.consultation.activeSafetyRules],
      ]),
    );
  });

  it('clears service and safety-rule cache after updating a service', async () => {
    const service = new AdminServicesService(
      servicesRepository as never,
      cacheService as unknown as CacheService,
    );
    const savedService = {
      id: 'service-1',
      name: 'Colour Correction',
      durationMinutes: 75,
      complexity: ServiceComplexity.HIGH,
    };

    servicesRepository.findOne.mockResolvedValue(null);
    servicesRepository.preload.mockResolvedValue(savedService);
    servicesRepository.save.mockResolvedValue(savedService);

    await service.update('service-1', {
      name: 'Colour Correction',
      durationMinutes: 75,
    });

    expect(cacheService.deleteKey.mock.calls).toEqual(
      expect.arrayContaining([
        [REDIS_CACHE_KEYS.consultation.activeService('service-1')],
        [REDIS_CACHE_KEYS.consultation.activeSafetyRules],
      ]),
    );
  });

  it('clears service and safety-rule cache after updating AI config', async () => {
    const service = new AdminServicesService(
      servicesRepository as never,
      cacheService as unknown as CacheService,
    );
    const savedService = {
      id: 'service-1',
      name: 'Colour Correction',
      durationMinutes: 60,
      complexity: ServiceComplexity.HIGH,
      requiredSkills: ['colour correction'],
      safetyTriggers: ['box dye'],
    };

    servicesRepository.preload.mockResolvedValue(savedService);
    servicesRepository.save.mockResolvedValue(savedService);

    await service.updateAiConfig('service-1', {
      requiredSkills: ['Colour Correction'],
      safetyTriggers: ['Box Dye'],
    });

    expect(cacheService.deleteKey.mock.calls).toEqual(
      expect.arrayContaining([
        [REDIS_CACHE_KEYS.consultation.activeService('service-1')],
        [REDIS_CACHE_KEYS.consultation.activeSafetyRules],
      ]),
    );
  });
});
