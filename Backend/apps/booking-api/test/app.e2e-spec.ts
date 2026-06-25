import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import { HealthController } from '../src/health.controller';

interface HealthResponseBody {
  status: string;
  service: string;
  timestamp: string;
}

describe('Booking API health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the booking API health response', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        const healthResponse = body as HealthResponseBody;

        expect(healthResponse).toMatchObject({
          status: 'ok',
          service: 'booking-api',
        });
        expect(typeof healthResponse.timestamp).toBe('string');
      });
  });
});
