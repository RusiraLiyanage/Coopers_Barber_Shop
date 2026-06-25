/// <reference types="jest" />

import { CacheService, REDIS_CACHE_KEYS } from '@coopers/common';
import { HairHistoryService } from './hair-history.service';

describe('HairHistoryService Redis invalidation', () => {
  const hairHistoryRepository = {
    create: jest.fn(),
    findOneOrFail: jest.fn(),
    save: jest.fn(),
  };
  const userRepository = {
    findOne: jest.fn(),
  };
  const staffRepository = {
    findOne: jest.fn(),
  };
  const cacheService = {
    deleteKey: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears the customer hair-history cache after creating history', async () => {
    const service = new HairHistoryService(
      hairHistoryRepository as never,
      userRepository as never,
      staffRepository as never,
      cacheService as unknown as CacheService,
    );
    const hairHistory = { id: 'history-1' };

    userRepository.findOne.mockResolvedValue({ id: 'user-1' });
    hairHistoryRepository.create.mockReturnValue(hairHistory);
    hairHistoryRepository.save.mockResolvedValue(hairHistory);
    hairHistoryRepository.findOneOrFail.mockResolvedValue(hairHistory);

    await service.create({
      clientId: 'user-1',
      service: 'Hair Coloring',
      hairState: ['dry ends'],
      visitDate: '2026-06-25',
    });

    expect(cacheService.deleteKey.mock.calls).toContainEqual([
      REDIS_CACHE_KEYS.consultation.clientHairHistory('user-1'),
    ]);
  });
});
