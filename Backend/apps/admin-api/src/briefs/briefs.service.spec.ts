/// <reference types="jest" />

import { CacheService, REDIS_CACHE_KEYS } from '@coopers/common';
import { BriefsService } from './briefs.service';

describe('BriefsService Redis invalidation', () => {
  const appointmentBriefRepository = {
    findOne: jest.fn(),
  };
  const appointmentRepository = {};
  const staffRepository = {};
  const hairHistoryRepository = {
    create: jest.fn(),
    findOneOrFail: jest.fn(),
    save: jest.fn(),
  };
  const cacheService = {
    deleteKey: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears customer hair-history cache after saving brief as history', async () => {
    const service = new BriefsService(
      appointmentBriefRepository as never,
      appointmentRepository as never,
      staffRepository as never,
      hairHistoryRepository as never,
      cacheService as unknown as CacheService,
    );
    const hairHistory = { id: 'history-1' };

    appointmentBriefRepository.findOne.mockResolvedValue({
      hairState: ['dry ends'],
      barber: null,
      booking: {
        customer: { id: 'user-1' },
        service: { name: 'Hair Coloring' },
        staff: { id: 'staff-1' },
        startAt: new Date('2026-06-25T01:00:00.000Z'),
      },
    });
    hairHistoryRepository.create.mockReturnValue(hairHistory);
    hairHistoryRepository.save.mockResolvedValue(hairHistory);
    hairHistoryRepository.findOneOrFail.mockResolvedValue(hairHistory);

    await service.createHairHistoryFromBrief('brief-1', {});

    expect(cacheService.deleteKey.mock.calls).toContainEqual([
      REDIS_CACHE_KEYS.consultation.clientHairHistory('user-1'),
    ]);
  });
});
