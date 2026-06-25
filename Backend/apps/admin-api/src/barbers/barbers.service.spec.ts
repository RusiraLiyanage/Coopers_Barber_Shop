/// <reference types="jest" />

import { CacheService, REDIS_CACHE_KEYS } from '@coopers/common';
import { StaffRole } from '@coopers/entities';
import { BarbersService } from './barbers.service';

describe('BarbersService Redis invalidation', () => {
  const staffRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };
  const appointmentRepository = {};
  const cacheService = {
    deleteKey: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears the available barber cache after creating a barber', async () => {
    const service = new BarbersService(
      staffRepository as never,
      appointmentRepository as never,
      cacheService as unknown as CacheService,
    );
    const staff = {
      displayName: 'Sofia Bennett',
      role: StaffRole.SENIOR,
    };

    staffRepository.create.mockReturnValue(staff);
    staffRepository.save.mockResolvedValue(staff);

    await service.create({
      displayName: 'Sofia Bennett',
      role: StaffRole.SENIOR,
    });

    expect(cacheService.deleteKey.mock.calls).toContainEqual([
      REDIS_CACHE_KEYS.consultation.availableBarbers,
    ]);
  });
});
