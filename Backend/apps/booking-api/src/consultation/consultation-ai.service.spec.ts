import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { HairHistory, SafetyRule, Service, Staff } from '@coopers/entities';
import { ConsultationAiService } from './consultation-ai.service';
import { ConsultationAnswerDto } from './dto/consultation-answer.dto';
import { HairPhotoDto } from './dto/hair-photo.dto';
import { ConsultationService } from './consultation.service';
import { ConsultationSubmitResponse } from './consultation.types';

type RecommendationContentFactory = {
  createRecommendationUserContent: (
    serviceId: string,
    answers: ConsultationAnswerDto[],
    hairPhoto?: HairPhotoDto,
  ) => Array<
    | {
        type: 'text';
        text: string;
      }
    | {
        type: 'image';
        source: {
          type: 'base64';
          media_type: string;
          data: string;
        };
      }
  >;
};

describe('ConsultationAiService', () => {
  let service: RecommendationContentFactory;

  beforeEach(() => {
    service = new ConsultationAiService(
      { get: jest.fn() } as unknown as ConfigService,
      {} as ConsultationService,
      {} as Repository<Service>,
      {} as Repository<Staff>,
      {} as Repository<SafetyRule>,
      {} as Repository<HairHistory>,
    ) as unknown as RecommendationContentFactory;
  });

  it('creates text-only recommendation content when no hair photo is provided', () => {
    const content = service.createRecommendationUserContent('service-1', [
      {
        questionId: 'desired-look',
        answer: 'Natural brown colour.',
      },
    ]);

    expect(content).toHaveLength(1);
    expect(content[0].type).toBe('text');

    if (content[0].type !== 'text') {
      throw new Error('Expected text block');
    }

    expect(JSON.parse(content[0].text)).toMatchObject({
      serviceId: 'service-1',
      hasHairPhoto: false,
    });
  });

  it('adds an Anthropic image block when a hair photo is provided', () => {
    const content = service.createRecommendationUserContent(
      'service-1',
      [
        {
          questionId: 'current-hair-state',
          answer: 'Dry ends and medium length.',
        },
      ],
      {
        mediaType: 'image/jpeg',
        data: 'YWJjZA==',
      },
    );

    expect(content).toHaveLength(2);
    expect(content[0].type).toBe('text');
    expect(content[1]).toEqual({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: 'YWJjZA==',
      },
    });

    if (content[0].type !== 'text') {
      throw new Error('Expected text block');
    }

    expect(JSON.parse(content[0].text)).toMatchObject({
      serviceId: 'service-1',
      hasHairPhoto: true,
    });
  });
});

describe('ConsultationAiService submit fallback', () => {
  const answers: ConsultationAnswerDto[] = [
    { questionId: 'desired-look', answer: 'Natural brown colour.' },
  ];

  // A hair-history repository whose query-builder chain resolves to [].
  function emptyHairHistoryRepository(): Repository<HairHistory> {
    const queryBuilder = {} as Record<string, jest.Mock>;
    const chain = jest.fn(() => queryBuilder);
    queryBuilder.leftJoinAndSelect = chain;
    queryBuilder.innerJoin = chain;
    queryBuilder.where = chain;
    queryBuilder.orderBy = chain;
    queryBuilder.addOrderBy = chain;
    queryBuilder.take = chain;
    queryBuilder.getMany = jest.fn().mockResolvedValue([]);

    return {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as Repository<HairHistory>;
  }

  // Proves the `await` fix: with no API key the first Claude call throws, and
  // submitConsultation must catch it and return the deterministic fallback.
  it('falls back to the deterministic service when Claude is unavailable', async () => {
    const fallbackResult = { matchScore: 42 } as unknown as ConsultationSubmitResponse;
    const fallbackService = {
      submitConsultation: jest.fn().mockResolvedValue(fallbackResult),
    } as unknown as ConsultationService;
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    const service = new ConsultationAiService(
      configService,
      fallbackService,
      {} as unknown as Repository<Service>,
      {} as unknown as Repository<Staff>,
      {} as unknown as Repository<SafetyRule>,
      {} as unknown as Repository<HairHistory>,
    );

    const result = await service.submitConsultation(
      'user-1',
      'service-1',
      answers,
    );

    expect(result).toBe(fallbackResult);
    expect(fallbackService.submitConsultation).toHaveBeenCalledWith(
      'user-1',
      'service-1',
      answers,
    );
  });

  // Proves the output-validation guard: a well-formed recommendation pointing
  // at a barber that is not in the available set is rejected, then falls back.
  it('falls back when Claude recommends a barber that is not available', async () => {
    const fallbackResult = { matchScore: 7 } as unknown as ConsultationSubmitResponse;
    const fallbackService = {
      submitConsultation: jest.fn().mockResolvedValue(fallbackResult),
    } as unknown as ConsultationService;
    const configService = {
      get: jest
        .fn()
        .mockImplementation((key: string) =>
          key === 'ANTHROPIC_API_KEY' ? 'test-key' : undefined,
        ),
    } as unknown as ConfigService;
    const servicesRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'service-1',
        name: 'Hair Coloring',
        complexity: 'high',
        requiredSkills: [],
        safetyTriggers: [],
        durationMinutes: 90,
        isActive: true,
      }),
    } as unknown as Repository<Service>;
    const staffRepository = {
      find: jest
        .fn()
        .mockResolvedValue([{ id: 'real-barber', role: 'senior' }]),
    } as unknown as Repository<Staff>;
    const safetyRuleRepository = {
      find: jest.fn().mockResolvedValue([]),
    } as unknown as Repository<SafetyRule>;

    const service = new ConsultationAiService(
      configService,
      fallbackService,
      servicesRepository,
      staffRepository,
      safetyRuleRepository,
      emptyHairHistoryRepository(),
    );

    // Claude returns a valid-shaped recommendation, but for a barber id that is
    // NOT in the available set → getValidatedMatchedBarber must reject it.
    (service as unknown as { anthropic: unknown }).anthropic = {
      messages: {
        create: jest.fn().mockResolvedValue({
          stop_reason: 'tool_use',
          usage: { cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
          content: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'finalize_consultation_result',
              input: {
                matchedBarberId: 'ghost-barber',
                matchScore: 80,
                matchReasons: ['Strong colour experience.'],
                safetyNotes: [],
                hairState: [],
                desiredLook: null,
                consultationSummary: 'Colour consultation summary.',
              },
            },
          ],
        }),
      },
    };

    const result = await service.submitConsultation(
      'user-1',
      'service-1',
      answers,
    );

    expect(result).toBe(fallbackResult);
    expect(fallbackService.submitConsultation).toHaveBeenCalled();
  });
});
