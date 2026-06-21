/// <reference types="jest" />

import { DataVersionService } from './data-version.service';

describe('DataVersionService', () => {
  const createRepository = (latestTimestamp: Date | string | null) => ({
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ latestTimestamp }),
    })),
  });

  it('returns the newest timestamp across admin-visible data sources', async () => {
    const newest = new Date('2026-06-20T04:30:00.000Z');
    const repositories = [
      createRepository('2026-06-18T01:00:00.000Z'),
      createRepository(new Date('2026-06-19T12:00:00.000Z')),
      createRepository(null),
      createRepository(newest),
      createRepository('2026-06-17T23:00:00.000Z'),
      createRepository('2026-06-19T20:00:00.000Z'),
      createRepository(null),
      createRepository('2026-06-16T08:00:00.000Z'),
    ] as const;

    const service = new DataVersionService(
      repositories[0] as never,
      repositories[1] as never,
      repositories[2] as never,
      repositories[3] as never,
      repositories[4] as never,
      repositories[5] as never,
      repositories[6] as never,
      repositories[7] as never,
    );

    await expect(service.getVersion()).resolves.toEqual({
      version: newest.toISOString(),
    });
  });

  it('returns the Unix epoch when no tracked source has data', async () => {
    const repositories = Array.from({ length: 8 }, () =>
      createRepository(null),
    );
    const service = new DataVersionService(
      repositories[0] as never,
      repositories[1] as never,
      repositories[2] as never,
      repositories[3] as never,
      repositories[4] as never,
      repositories[5] as never,
      repositories[6] as never,
      repositories[7] as never,
    );

    await expect(service.getVersion()).resolves.toEqual({
      version: new Date(0).toISOString(),
    });
  });
});
