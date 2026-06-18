import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { HairHistory, SafetyRule, Service, Staff } from '@coopers/entities';
import { ConsultationAiService } from './consultation-ai.service';
import { ConsultationAnswerDto } from './dto/consultation-answer.dto';
import { HairPhotoDto } from './dto/hair-photo.dto';
import { ConsultationService } from './consultation.service';

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
