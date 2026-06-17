import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsService } from './appointments.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Appointment,
  AppointmentBrief,
  Service,
  Staff,
} from '@coopers/entities';
import { StaffService } from '../staff/staff.service';
import { ConflictException } from '@nestjs/common';

// Mock repositories
const mockAppointmentsRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockAppointmentBriefsRepo = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockAppointmentsQueryBuilder = {
  select: jest.fn(),
  addSelect: jest.fn(),
  innerJoin: jest.fn(),
  where: jest.fn(),
  andWhere: jest.fn(),
  getRawMany: jest.fn(),
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
    timezone: 'Australia/Sydney',
    bufferAfterMinutes: 15,
  }),
  getBufferMinutes: jest.fn().mockResolvedValue(15),
};

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  beforeEach(async () => {
    mockAppointmentsRepo.createQueryBuilder.mockReturnValue(
      mockAppointmentsQueryBuilder,
    );
    mockAppointmentsQueryBuilder.select.mockReturnValue(
      mockAppointmentsQueryBuilder,
    );
    mockAppointmentsQueryBuilder.addSelect.mockReturnValue(
      mockAppointmentsQueryBuilder,
    );
    mockAppointmentsQueryBuilder.innerJoin.mockReturnValue(
      mockAppointmentsQueryBuilder,
    );
    mockAppointmentsQueryBuilder.where.mockReturnValue(
      mockAppointmentsQueryBuilder,
    );
    mockAppointmentsQueryBuilder.andWhere.mockReturnValue(
      mockAppointmentsQueryBuilder,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: getRepositoryToken(Appointment),
          useValue: mockAppointmentsRepo,
        },
        {
          provide: getRepositoryToken(AppointmentBrief),
          useValue: mockAppointmentBriefsRepo,
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
    mockAppointmentsQueryBuilder.getRawMany.mockResolvedValue([]);
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
    mockAppointmentsQueryBuilder.getRawMany.mockResolvedValue([
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
    mockAppointmentsQueryBuilder.getRawMany.mockResolvedValue([]);
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
    mockAppointmentsQueryBuilder.getRawMany.mockResolvedValue([]);
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

    mockAppointmentsQueryBuilder.getRawMany.mockResolvedValue([
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

  it('should reject a slot when its own buffer would overlap the next appointment', async () => {
    mockServicesRepo.findOneBy.mockResolvedValue({
      id: 'svc3',
      name: 'Consultation',
      durationMinutes: 15,
    });

    mockAppointmentsQueryBuilder.getRawMany.mockResolvedValue([
      {
        startAt: new Date('2025-09-24T09:45:00+10:00'),
        endAt: new Date('2025-09-24T10:00:00+10:00'),
        status: 'booked',
      },
      {
        startAt: new Date('2025-09-24T10:30:00+10:00'),
        endAt: new Date('2025-09-24T11:15:00+10:00'),
        status: 'booked',
      },
    ]);

    mockStaffRepo.findOne.mockResolvedValue({ bufferAfterMinutes: 15 });

    const slots = await service.getAvailability('svc3', '2025-09-24');

    expect(slots).not.toContain('10:15-10:30');
    expect(slots).toContain('11:30-11:45');
  });

  // Test case 6: Ensure that long services are correctly blocked from overlapping breaks or work end
  it('should correctly block long services (90 mins) from overlapping breaks or work end', async () => {
    mockServicesRepo.findOneBy.mockResolvedValue({
      id: 'svc2',
      name: 'Hair Coloring',
      durationMinutes: 90,
    });

    mockAppointmentsQueryBuilder.getRawMany.mockResolvedValue([]); // no bookings
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
    mockAppointmentsQueryBuilder.getRawMany.mockResolvedValue([
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

  it('should book an appointment with the selected barber when staffId is provided', async () => {
    const selectedStaff = {
      id: '22222222-2222-2222-2222-222222222222',
      displayName: 'Sofia Bennett',
      timezone: 'Australia/Sydney',
      bufferAfterMinutes: 15,
      active: true,
      available: true,
    };

    mockServicesRepo.findOneBy.mockResolvedValue({
      id: 'svc1',
      name: 'Haircut',
      durationMinutes: 30,
    });
    const savedAppointment = {
      id: 'appointment-1',
      service: {
        id: 'svc1',
        name: 'Haircut',
        durationMinutes: 30,
      },
      staff: selectedStaff,
      startAt: new Date('2025-09-23T23:00:00.000Z'),
      endAt: new Date('2025-09-23T23:30:00.000Z'),
      status: 'booked',
    };

    mockStaffRepo.findOne.mockResolvedValue(selectedStaff);
    mockAppointmentsQueryBuilder.getRawMany.mockResolvedValue([]);
    mockAppointmentsRepo.create.mockReturnValue(savedAppointment);
    mockAppointmentsRepo.save.mockResolvedValue(savedAppointment);

    const result = await service.book(
      { userId: 'user-1' },
      {
        serviceId: 'svc1',
        staffId: selectedStaff.id,
        date: '2025-09-24',
        slot: '09:00-09:30',
      },
    );

    expect(mockStaffRepo.findOne).toHaveBeenCalledWith({
      where: {
        id: selectedStaff.id,
        active: true,
        available: true,
      },
    });
    expect(mockStaffService.getDefaultStaff).not.toHaveBeenCalled();
    expect(mockAppointmentsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        staff: selectedStaff,
      }),
    );
    expect(result.staffId).toBe(selectedStaff.id);
    expect(result.staffName).toBe('Sofia Bennett');
  });

  it('should create an appointment brief when consultation summary is provided', async () => {
    const selectedStaff = {
      id: '22222222-2222-2222-2222-222222222222',
      displayName: 'Sofia Bennett',
      timezone: 'Australia/Sydney',
      bufferAfterMinutes: 15,
      active: true,
      available: true,
    };
    const savedAppointment = {
      id: 'appointment-1',
      service: {
        id: 'svc2',
        name: 'Hair Coloring',
        durationMinutes: 90,
      },
      staff: selectedStaff,
      startAt: new Date('2025-09-23T23:00:00.000Z'),
      endAt: new Date('2025-09-24T00:30:00.000Z'),
      status: 'booked',
    };
    const savedBrief = {
      id: 'brief-1',
      booking: savedAppointment,
      barber: selectedStaff,
    };

    mockServicesRepo.findOneBy.mockResolvedValue(savedAppointment.service);
    mockStaffRepo.findOne.mockResolvedValue(selectedStaff);
    mockAppointmentsQueryBuilder.getRawMany.mockResolvedValue([]);
    mockAppointmentsRepo.create.mockReturnValue(savedAppointment);
    mockAppointmentsRepo.save.mockResolvedValue(savedAppointment);
    mockAppointmentBriefsRepo.create.mockReturnValue(savedBrief);
    mockAppointmentBriefsRepo.save.mockResolvedValue(savedBrief);

    await service.book(
      { userId: 'user-1' },
      {
        serviceId: 'svc2',
        staffId: selectedStaff.id,
        date: '2025-09-24',
        slot: '09:00-10:30',
        consultationSummary:
          'Client wants a natural brown colour and mentioned dry ends.',
        safetyNotes: 'Confirm recent bleach before applying colour.',
        hairState: ['dry hair', 'recent bleach', 'dry hair'],
        desiredLook: 'Natural brown colour.',
      },
    );

    expect(mockAppointmentBriefsRepo.create).toHaveBeenCalledWith({
      booking: savedAppointment,
      barber: selectedStaff,
      clientSummary:
        'Client wants a natural brown colour and mentioned dry ends.',
      safetyNotes: 'Confirm recent bleach before applying colour.',
      hairState: ['dry hair', 'recent bleach'],
      desiredLook: 'Natural brown colour.',
    });
    expect(mockAppointmentBriefsRepo.save).toHaveBeenCalledWith(savedBrief);
  });

  it('should update an appointment onto the selected date when the slot is available', async () => {
    const appointment = {
      id: 'appointment-1',
      customer: { id: 'user-1' },
      service: {
        id: 'svc1',
        name: 'Haircut',
        durationMinutes: 30,
      },
      staff: {
        id: '11111111-1111-1111-1111-111111111111',
        displayName: 'Main Staff',
        timezone: 'Australia/Sydney',
        bufferAfterMinutes: 15,
      },
      startAt: new Date('2025-09-24T00:00:00.000Z'),
      endAt: new Date('2025-09-24T00:30:00.000Z'),
      status: 'booked',
    };

    mockAppointmentsRepo.findOne.mockResolvedValue(appointment);
    mockAppointmentsQueryBuilder.getRawMany.mockResolvedValue([]);
    mockAppointmentsRepo.save.mockImplementation(
      (updatedAppointment: typeof appointment) => updatedAppointment,
    );

    const result = await service.updateAppointmentTime(
      { userId: 'user-1' },
      'appointment-1',
      {
        date: '2025-09-25',
        slot: '10:30-11:00',
      },
    );

    expect(appointment.startAt.toISOString()).toBe('2025-09-25T00:30:00.000Z');
    expect(appointment.endAt.toISOString()).toBe('2025-09-25T01:00:00.000Z');
    expect(result.startAt).toContain('25/09/2025');
    expect(result.startAt).toContain('10:30');
  });

  it('should include cancelled appointments in the user appointment history', async () => {
    mockAppointmentsRepo.find.mockResolvedValue([
      {
        id: 'appointment-1',
        service: { id: 'svc1', name: 'Haircut' },
        staff: {
          id: '11111111-1111-1111-1111-111111111111',
          displayName: 'Main Staff',
        },
        startAt: new Date('2025-09-24T00:00:00.000Z'),
        endAt: new Date('2025-09-24T00:30:00.000Z'),
        status: 'booked',
      },
      {
        id: 'appointment-2',
        service: { id: 'svc2', name: 'Hair Styling' },
        staff: {
          id: '11111111-1111-1111-1111-111111111111',
          displayName: 'Main Staff',
        },
        startAt: new Date('2025-09-25T00:00:00.000Z'),
        endAt: new Date('2025-09-25T00:45:00.000Z'),
        status: 'cancelled_by_client',
      },
    ]);

    const result = await service.findAllForUser('user-1');

    expect(mockAppointmentsRepo.find).toHaveBeenCalledWith({
      where: { customer: { id: 'user-1' } },
      relations: ['service', 'staff'],
      order: { startAt: 'DESC' },
    });
    expect(result).toHaveLength(2);
    expect(result.map((appointment) => appointment.status)).toEqual([
      'booked',
      'cancelled_by_client',
    ]);
  });

  it('should soft cancel appointments as cancelled by client', async () => {
    const appointment = {
      id: 'appointment-1',
      customer: { id: 'user-1' },
      service: {
        id: 'svc1',
        name: 'Haircut',
      },
      staff: {
        id: '11111111-1111-1111-1111-111111111111',
        displayName: 'Main Staff',
        timezone: 'Australia/Sydney',
      },
      startAt: new Date('2025-09-24T00:00:00.000Z'),
      endAt: new Date('2025-09-24T00:30:00.000Z'),
      status: 'booked',
    };

    mockAppointmentsRepo.findOne.mockResolvedValue(appointment);
    mockAppointmentsRepo.save.mockImplementation(
      (updatedAppointment: typeof appointment) => updatedAppointment,
    );

    const result = await service.cancelAppointment(
      { userId: 'user-1' },
      'appointment-1',
    );

    expect(appointment.status).toBe('cancelled_by_client');
    expect(result.status).toBe('cancelled_by_client');
  });
});
