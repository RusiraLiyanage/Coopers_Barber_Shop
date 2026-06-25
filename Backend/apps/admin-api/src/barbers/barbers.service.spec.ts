/// <reference types="jest" />

import { CacheService, REDIS_CACHE_KEYS } from '@coopers/common';
import { StaffRole } from '@coopers/entities';
import { BarbersService } from './barbers.service';

describe('BarbersService Redis invalidation', () => {
  const staffRepository = {
    create: jest.fn(),
    findOne: jest.fn(),
    preload: jest.fn(),
    remove: jest.fn(),
    save: jest.fn(),
  };
  const appointmentRepository = {
    count: jest.fn(),
  };
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

  it('clears the available barber cache after updating a barber', async () => {
    const service = new BarbersService(
      staffRepository as never,
      appointmentRepository as never,
      cacheService as unknown as CacheService,
    );
    const staff = {
      id: 'staff-1',
      displayName: 'Sofia Bennett',
      role: StaffRole.SENIOR,
    };

    staffRepository.preload.mockResolvedValue(staff);
    staffRepository.save.mockResolvedValue(staff);

    await service.update('staff-1', {
      displayName: 'Sofia Bennett',
      role: StaffRole.SENIOR,
    });

    expect(cacheService.deleteKey.mock.calls).toContainEqual([
      REDIS_CACHE_KEYS.consultation.availableBarbers,
    ]);
  });

  it('clears the available barber cache after deleting a barber', async () => {
    const service = new BarbersService(
      staffRepository as never,
      appointmentRepository as never,
      cacheService as unknown as CacheService,
    );
    const staff = {
      id: 'staff-1',
      displayName: 'Sofia Bennett',
      role: StaffRole.SENIOR,
    };

    staffRepository.findOne.mockResolvedValue(staff);
    appointmentRepository.count.mockResolvedValue(0);
    staffRepository.remove.mockResolvedValue(staff);

    await service.delete('staff-1');

    expect(cacheService.deleteKey.mock.calls).toContainEqual([
      REDIS_CACHE_KEYS.consultation.availableBarbers,
    ]);
  });
});
