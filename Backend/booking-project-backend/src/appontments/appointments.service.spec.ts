import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsService } from './appointments.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { Service } from '../services/entities/service.entity';
import { Staff } from '../staff/entities/staff.entity';
import { StaffService } from '../staff/staff.service';
import { ConflictException } from '@nestjs/common';

// Mock repositories
const mockAppointmentsRepo = {
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockServicesRepo = {
  findOneBy: jest.fn(),
};

const mockStaffRepo = {
  findOne: jest.fn(),
};

// Mock StaffService
const mockStaffService = {
  getDefaultStaff: jest.fn().mockResolvedValue({
    id: '11111111-1111-1111-1111-111111111111',
    displayName: 'Main Staff',
    bufferAfterMinutes: 15,
  }),
  getBufferMinutes: jest.fn().mockResolvedValue(15),
};

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: getRepositoryToken(Appointment),
          useValue: mockAppointmentsRepo,
        },
        { provide: getRepositoryToken(Service), useValue: mockServicesRepo },
        { provide: getRepositoryToken(Staff), useValue: mockStaffRepo },
        { provide: StaffService, useValue: mockStaffService },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test case 1  : Get availability for a day with no bookings
  it('should return slots for a day with no bookings', async () => {
    mockServicesRepo.findOneBy.mockResolvedValue({
      id: 'svc1',
      name: 'Haircut',
      durationMinutes: 30,
    });
    mockAppointmentsRepo.find.mockResolvedValue([]);
    mockStaffRepo.findOne.mockResolvedValue({
      bufferAfterMinutes: 15,
    });

    const slots = await service.getAvailability('svc1', '2025-09-24');

    expect(slots).toContain('09:00-09:30');
    expect(slots).not.toContain('09:15-09:45');
    expect(slots).not.toContain('09:30-10:00');
    expect(slots).toContain('09:45-10:15');
    expect(slots).toContain('13:15-13:45'); // after lunch buffer
    expect(slots.some((s) => s.startsWith('12'))).toBe(false); // no lunch slots
  });

  // Test case 2: Get availability for a day with existing bookings that block certain slots
  it('should skip slots that overlap with existing appointments + buffer', async () => {
    mockServicesRepo.findOneBy.mockResolvedValue({
      id: 'svc1',
      name: 'Haircut',
      durationMinutes: 30,
    });
    mockAppointmentsRepo.find.mockResolvedValue([
      {
        startAt: new Date('2025-09-24T09:00:00+10:00'),
        endAt: new Date('2025-09-24T09:30:00+10:00'),
        status: 'booked',
      },
    ]);
    mockStaffRepo.findOne.mockResolvedValue({
      bufferAfterMinutes: 15,
    });

    const slots = await service.getAvailability('svc1', '2025-09-24');

    expect(slots).not.toContain('09:00-09:30'); // blocked
    expect(slots).toContain('09:45-10:15'); // next valid
  });

  // Test case 3: Ensure no slots are available during lunch break and buffer time after lunch
  it('should not allow slots during or immediately after lunch until 13:15', async () => {
    mockServicesRepo.findOneBy.mockResolvedValue({
      id: 'svc1',
      name: 'Haircut',
      durationMinutes: 30,
    });
    mockAppointmentsRepo.find.mockResolvedValue([]);
    mockStaffRepo.findOne.mockResolvedValue({
      bufferAfterMinutes: 15,
    });

    const slots = await service.getAvailability('svc1', '2025-09-24');

    expect(slots).not.toContain('13:00-13:30'); // no immediate lunch slot
    expect(slots).toContain('13:15-13:45'); // first after lunch
  });

  // Test case 4: Ensure slots do not extend beyond working hours (09:00 - 17:00)
  it('should not allow slots that extend past 17:00', async () => {
    mockServicesRepo.findOneBy.mockResolvedValue({
      id: 'svc1',
      name: 'Haircut',
      durationMinutes: 30,
    });
    mockAppointmentsRepo.find.mockResolvedValue([]);
    mockStaffRepo.findOne.mockResolvedValue({
      bufferAfterMinutes: 15,
    });

    const slots = await service.getAvailability('svc1', '2025-09-24');

    expect(slots).toContain('16:15-16:45'); // last valid
    expect(slots).not.toContain('16:45-17:15'); // beyond working hours
  });

  // Test case 5: Ensure that multiple consecutive bookings are handled correctly
  it('should handle multiple consecutive bookings and only allow slots after last buffer', async () => {
    mockServicesRepo.findOneBy.mockResolvedValue({
      id: 'svc1',
      name: 'Haircut',
      durationMinutes: 30,
    });

    mockAppointmentsRepo.find.mockResolvedValue([
      {
        startAt: new Date('2025-09-24T09:00:00+10:00'),
        endAt: new Date('2025-09-24T09:30:00+10:00'),
        status: 'booked',
      },
      {
        startAt: new Date('2025-09-24T09:45:00+10:00'),
        endAt: new Date('2025-09-24T10:15:00+10:00'),
        status: 'booked',
      },
    ]);

    mockStaffRepo.findOne.mockResolvedValue({ bufferAfterMinutes: 15 });

    const slots = await service.getAvailability('svc1', '2025-09-24');

    // Both early slots should be blocked
    expect(slots).not.toContain('09:00-09:30');
    expect(slots).not.toContain('09:45-10:15');

    // First available slot should now be 10:30
    expect(slots).toContain('10:30-11:00');
  });

  // Test case 6: Ensure that long services are correctly blocked from overlapping breaks or work end
  it('should correctly block long services (90 mins) from overlapping breaks or work end', async () => {
    mockServicesRepo.findOneBy.mockResolvedValue({
      id: 'svc2',
      name: 'Hair Coloring',
      durationMinutes: 90,
    });

    mockAppointmentsRepo.find.mockResolvedValue([]); // no bookings
    mockStaffRepo.findOne.mockResolvedValue({ bufferAfterMinutes: 15 });

    const slots = await service.getAvailability('svc2', '2025-09-24');

    // 09:00-10:30 is valid
    expect(slots).toContain('09:00-10:30');

    // Should NOT allow slot that runs into lunch
    expect(slots).not.toContain('11:30-13:00');

    // Last valid slot must end exactly at 17:00
    expect(slots).toContain('15:00-16:30');
    expect(slots).not.toContain('16:00-17:30');
  });

  it('should reject booking a slot that falls inside an existing appointment plus buffer', async () => {
    mockServicesRepo.findOneBy.mockResolvedValue({
      id: 'svc1',
      name: 'Haircut',
      durationMinutes: 30,
    });
    mockAppointmentsRepo.find.mockResolvedValue([
      {
        startAt: new Date('2025-09-24T09:00:00+10:00'),
        endAt: new Date('2025-09-24T09:45:00+10:00'),
        status: 'booked',
      },
    ]);
    mockStaffService.getDefaultStaff.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      displayName: 'Main Staff',
      timezone: 'Australia/Sydney',
      bufferAfterMinutes: 15,
    });

    await expect(
      service.book(
        { userId: 'user-1' },
        {
          serviceId: 'svc1',
          date: '2025-09-24',
          slot: '09:15-09:45',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
