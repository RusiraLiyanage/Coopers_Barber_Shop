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
import { CacheService, REDIS_CACHE_KEYS } from '@coopers/common';
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
  let cacheService: jest.Mocked<Pick<CacheService, 'getJson' | 'setJson'>>;

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
    jest.useFakeTimers().setSystemTime(new Date('2026-06-26T00:00:00.000Z'));

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
        {
          provide: CacheService,
          useValue: {
            getJson: jest.fn().mockResolvedValue(null),
            setJson: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(ConsultationService);
    servicesRepository = module.get(getRepositoryToken(Service));
    staffRepository = module.get(getRepositoryToken(Staff));
    safetyRuleRepository = module.get(getRepositoryToken(SafetyRule));
    hairHistoryRepository = module.get(getRepositoryToken(HairHistory));
    cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.useRealTimers();
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

    expect(servicesRepository.findOne.mock.calls[0]?.[0]).toEqual({
      where: { id: colourService.id, isActive: true },
    });
    expect(queryBuilder.where.mock.calls[0]).toEqual([
      'client.id = :userId',
      {
        userId: 'user-1',
      },
    ]);
    expect(queryBuilder.take.mock.calls[0]).toEqual([5]);
    expect(result.questions.map((question) => question.id)).toEqual([
      'desired-look',
      'current-hair-state',
      'safety-check',
      'recent-chemical-history',
    ]);
    expect(result.previousHairHistory).toEqual([
      expect.objectContaining({
        service: 'Hair Coloring',
        hairState: ['dry ends'],
        productsUsed: 'toner',
        barberNotes: 'Use lower developer',
        visitDate: '2026-01-10',
        relevance: 'medium',
        safetyCritical: false,
      }),
    ]);
  });

  it('adds a follow-up question when old history has safety-critical context', async () => {
    const history = [
      {
        service: 'Hair Coloring',
        hairState: ['scalp sensitivity'],
        productsUsed: null,
        barberNotes: 'Patch test recommended before colour.',
        visitDate: '2024-01-10',
      },
    ] as HairHistory[];

    servicesRepository.findOne.mockResolvedValue(colourService);
    hairHistoryRepository.createQueryBuilder.mockReturnValue(
      createHairHistoryQueryBuilder(history) as never,
    );

    const result = await service.startConsultation('user-1', colourService.id);

    expect(result.questions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'history-follow-up',
          required: true,
        }),
      ]),
    );
    expect(
      result.questions.find((question) => question.id === 'history-follow-up')
        ?.label,
    ).toContain('scalp sensitivity');
    expect(result.previousHairHistory[0]).toEqual(
      expect.objectContaining({
        relevance: 'low',
        safetyCritical: true,
      }),
    );
  });

  it('loads service context and hair history from Redis when cached', async () => {
    const history = [
      {
        service: 'Hair Coloring',
        hairState: ['dry ends'],
        productsUsed: 'toner',
        barberNotes: 'Use lower developer',
        visitDate: '2026-01-10',
        createdAt: '2026-01-10T00:00:00.000Z',
      },
    ] as unknown as HairHistory[];

    cacheService.getJson.mockImplementation((key: string) => {
      if (
        key === REDIS_CACHE_KEYS.consultation.activeService(colourService.id)
      ) {
        return Promise.resolve({
          ...colourService,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        } as unknown as Service);
      }

      if (key === REDIS_CACHE_KEYS.consultation.clientHairHistory('user-1')) {
        return Promise.resolve(history);
      }

      return Promise.resolve(null);
    });

    const result = await service.startConsultation('user-1', colourService.id);

    expect(servicesRepository.findOne.mock.calls).toHaveLength(0);
    expect(hairHistoryRepository.createQueryBuilder.mock.calls).toHaveLength(0);
    expect(cacheService.setJson.mock.calls).toHaveLength(0);
    expect(result.service.id).toBe(colourService.id);
    expect(result.previousHairHistory).toEqual([
      expect.objectContaining({
        service: 'Hair Coloring',
        hairState: ['dry ends'],
        productsUsed: 'toner',
        barberNotes: 'Use lower developer',
        visitDate: '2026-01-10',
        relevance: 'medium',
        safetyCritical: false,
      }),
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

    expect(safetyRuleRepository.find.mock.calls[0]?.[0]).toEqual({
      where: { active: true },
      order: { createdAt: 'DESC' },
    });
    expect(staffRepository.find.mock.calls[0]?.[0]).toEqual({
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

  it('uses cached safety rules and available barbers during matching', async () => {
    cacheService.getJson.mockImplementation((key: string) => {
      if (
        key === REDIS_CACHE_KEYS.consultation.activeService(colourService.id)
      ) {
        return Promise.resolve({
          ...colourService,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        } as unknown as Service);
      }

      if (key === REDIS_CACHE_KEYS.consultation.clientHairHistory('user-1')) {
        return Promise.resolve([]);
      }

      if (key === REDIS_CACHE_KEYS.consultation.activeSafetyRules) {
        return Promise.resolve([
          {
            serviceIds: [colourService.id],
            active: true,
            condition: 'box dye',
            severity: SafetyRuleSeverity.HIGH,
            message: 'Review box-dye history before colour correction.',
            createdAt: '2026-01-03T00:00:00.000Z',
            updatedAt: '2026-01-04T00:00:00.000Z',
          },
        ] as unknown as SafetyRule[]);
      }

      if (key === REDIS_CACHE_KEYS.consultation.availableBarbers) {
        return Promise.resolve([
          {
            ...juniorBarber,
            createdAt: '2026-01-05T00:00:00.000Z',
            updatedAt: '2026-01-06T00:00:00.000Z',
          },
          {
            ...seniorBarber,
            createdAt: '2026-01-05T00:00:00.000Z',
            updatedAt: '2026-01-06T00:00:00.000Z',
          },
        ] as unknown as Staff[]);
      }

      return Promise.resolve(null);
    });

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
          answer: 'I used box dye.',
        },
      ],
    );

    expect(servicesRepository.findOne.mock.calls).toHaveLength(0);
    expect(hairHistoryRepository.createQueryBuilder.mock.calls).toHaveLength(0);
    expect(safetyRuleRepository.find.mock.calls).toHaveLength(0);
    expect(staffRepository.find.mock.calls).toHaveLength(0);
    expect(result.matchedBarber.id).toBe(seniorBarber.id);
    expect(result.safetyNotes).toEqual(
      expect.arrayContaining([
        {
          severity: SafetyRuleSeverity.HIGH,
          message: 'Review box-dye history before colour correction.',
          source: 'safety-rule',
        },
      ]),
    );
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
