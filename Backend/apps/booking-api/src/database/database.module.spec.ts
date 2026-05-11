import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Appointment } from '../appontments/entities/appointment.entity';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';

describe('DatabaseModule', () => {
  let repo: Repository<Appointment>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getRepositoryToken(Appointment),
          useClass: Repository, // mock class
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
      ],
    }).compile();

    repo = module.get<Repository<Appointment>>(getRepositoryToken(Appointment));
  });

  // Basic test to ensure the repository is defined
  it('should allow mocked repository calls', async () => {
    jest.spyOn(repo, 'count').mockResolvedValue(5);
    const count = await repo.count();
    expect(count).toBe(5);
  });
});
