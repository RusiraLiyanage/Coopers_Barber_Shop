import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServicesService } from './services.service';
import { Service } from './entities/service.entity';

describe('ServicesService', () => {
  let service: ServicesService;
  let repo: Repository<Service>;

  const mockServiceRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: getRepositoryToken(Service),
          useValue: mockServiceRepo,
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
    repo = module.get<Repository<Service>>(getRepositoryToken(Service));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // testing findAll() ==========================================================
  it('should return all active services', async () => {
    const mockServices = [
      { id: '1', name: 'Haircut', isActive: true } as Service,
      { id: '2', name: 'Massage', isActive: true } as Service,
    ];
    mockServiceRepo.find.mockResolvedValue(mockServices);

    const result = await service.findAll();
    expect(result).toEqual(mockServices);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.find).toHaveBeenCalledWith({ where: { isActive: true } });
  });

  // testing findOne() ==========================================================
  it('should return a service by id', async () => {
    const mockService = { id: '1', name: 'Haircut', isActive: true } as Service;
    mockServiceRepo.findOne.mockResolvedValue(mockService);

    const result = await service.findOne('1');
    expect(result).toEqual(mockService);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
  });

  // edge case: service not found
  it('should return null if service not found', async () => {
    mockServiceRepo.findOne.mockResolvedValue(null);

    const result = await service.findOne('999');
    expect(result).toBeNull();
  });
});
