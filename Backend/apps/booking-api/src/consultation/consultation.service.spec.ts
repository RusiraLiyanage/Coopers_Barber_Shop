import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  HairHistory,
  SafetyRule,
  SafetyRuleSeverity,
  Service,
  ServiceComplexity,
  Staff,
  StaffGender,
  StaffRole,
} from '@coopers/entities';
import { Repository } from 'typeorm';
import { ConsultationService } from './consultation.service';

function createHairHistoryQueryBuilder(records: HairHistory[]) {
  const queryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(records),
  };

  return queryBuilder;
}

describe('ConsultationService', () => {
  let service: ConsultationService;
  let servicesRepository: jest.Mocked<Repository<Service>>;
  let staffRepository: jest.Mocked<Repository<Staff>>;
  let safetyRuleRepository: jest.Mocked<Repository<SafetyRule>>;
  let hairHistoryRepository: jest.Mocked<Repository<HairHistory>>;

  const colourService = {
    id: 'service-colour',
    name: 'Colour Correction Consultation',
    isActive: true,
    complexity: ServiceComplexity.HIGH,
    requiredSkills: ['colour correction', 'bleach work'],
    safetyTriggers: ['box dye', 'sensitive scalp'],
  } as Service;

  const seniorBarber = {
    id: 'staff-senior',
    displayName: 'Sofia Bennett',
    gender: StaffGender.FEMALE,
    role: StaffRole.SENIOR,
    rating: 4.8,
    skills: ['colour correction', 'bleach work', 'sensitive scalp'],
    active: true,
    available: true,
  } as Staff;

  const juniorBarber = {
    id: 'staff-junior',
    displayName: 'Marcus Reed',
    gender: StaffGender.MALE,
    role: StaffRole.JUNIOR,
    rating: 4.9,
    skills: ['haircut'],
    active: true,
    available: true,
  } as Staff;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultationService,
        {
          provide: getRepositoryToken(Service),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Staff),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SafetyRule),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(HairHistory),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ConsultationService);
    servicesRepository = module.get(getRepositoryToken(Service));
    staffRepository = module.get(getRepositoryToken(Staff));
    safetyRuleRepository = module.get(getRepositoryToken(SafetyRule));
    hairHistoryRepository = module.get(getRepositoryToken(HairHistory));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('builds service-specific questions and limits previous hair history', async () => {
    const history = [
      {
        service: 'Hair Coloring',
        hairState: ['dry ends'],
        productsUsed: 'toner',
        barberNotes: 'Use lower developer',
        visitDate: '2026-01-10',
      },
    ] as HairHistory[];
    const queryBuilder = createHairHistoryQueryBuilder(history);

    servicesRepository.findOne.mockResolvedValue(colourService);
    hairHistoryRepository.createQueryBuilder.mockReturnValue(
      queryBuilder as never,
    );

    const result = await service.startConsultation('user-1', colourService.id);

    expect(servicesRepository.findOne).toHaveBeenCalledWith({
      where: { id: colourService.id, isActive: true },
    });
    expect(queryBuilder.where).toHaveBeenCalledWith('client.id = :userId', {
      userId: 'user-1',
    });
    expect(queryBuilder.take).toHaveBeenCalledWith(5);
    expect(result.questions.map((question) => question.id)).toEqual([
      'desired-look',
      'current-hair-state',
      'safety-check',
      'recent-chemical-history',
    ]);
    expect(result.previousHairHistory).toEqual([
      {
        service: 'Hair Coloring',
        hairState: ['dry ends'],
        productsUsed: 'toner',
        barberNotes: 'Use lower developer',
        visitDate: '2026-01-10',
      },
    ]);
  });

  it('throws when the selected service is not active', async () => {
    servicesRepository.findOne.mockResolvedValue(null);
    hairHistoryRepository.createQueryBuilder.mockReturnValue(
      createHairHistoryQueryBuilder([]) as never,
    );

    await expect(
      service.startConsultation('user-1', 'missing-service'),
    ).rejects.toThrow(NotFoundException);
  });

  it('matches a senior barber when safety rules are triggered', async () => {
    servicesRepository.findOne.mockResolvedValue(colourService);
    hairHistoryRepository.createQueryBuilder.mockReturnValue(
      createHairHistoryQueryBuilder([
        {
          service: 'Previous colour',
          hairState: ['box dye'],
          productsUsed: null,
          barberNotes: 'Sensitive scalp mentioned',
          visitDate: '2026-01-10',
        },
      ] as HairHistory[]) as never,
    );
    safetyRuleRepository.find.mockResolvedValue([
      {
        serviceIds: [colourService.id],
        active: true,
        condition: 'box dye',
        severity: SafetyRuleSeverity.HIGH,
        message: 'Review box-dye history before colour correction.',
      },
    ] as SafetyRule[]);
    staffRepository.find.mockResolvedValue([juniorBarber, seniorBarber]);

    const result = await service.submitConsultation(
      'user-1',
      colourService.id,
      [
        {
          questionId: 'desired-look',
          answer: 'Please make it natural brown.',
        },
        {
          questionId: 'safety-check',
          answer: 'I used box dye and have a sensitive scalp.',
        },
      ],
    );

    expect(safetyRuleRepository.find).toHaveBeenCalledWith({
      where: { active: true },
      order: { createdAt: 'DESC' },
    });
    expect(staffRepository.find).toHaveBeenCalledWith({
      where: { active: true, available: true },
      order: { displayName: 'ASC' },
    });
    expect(result.matchedBarber.id).toBe(seniorBarber.id);
    expect(result.matchedBarber.gender).toBe(StaffGender.FEMALE);
    expect(result.safetyNotes).toEqual(
      expect.arrayContaining([
        {
          severity: SafetyRuleSeverity.HIGH,
          message: 'Review box-dye history before colour correction.',
          source: 'safety-rule',
        },
        {
          severity: SafetyRuleSeverity.LOW,
          message:
            'Customer mentioned sensitive scalp. Confirm before starting the service.',
          source: 'service-trigger',
        },
      ]),
    );
    expect(result.desiredLook).toBe('Please make it natural brown.');
    expect(result.hairState).toEqual(
      expect.arrayContaining(['box dye', 'sensitive scalp']),
    );
    expect(result.generation).toEqual({ source: 'fallback', model: null });
  });

  it('throws when no active available barbers exist', async () => {
    servicesRepository.findOne.mockResolvedValue(colourService);
    hairHistoryRepository.createQueryBuilder.mockReturnValue(
      createHairHistoryQueryBuilder([]) as never,
    );
    safetyRuleRepository.find.mockResolvedValue([]);
    staffRepository.find.mockResolvedValue([]);

    await expect(
      service.submitConsultation('user-1', colourService.id, [
        {
          questionId: 'desired-look',
          answer: 'Natural colour please.',
        },
      ]),
    ).rejects.toThrow(BadRequestException);
  });
});
