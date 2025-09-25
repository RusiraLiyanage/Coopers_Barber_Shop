import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffService } from './staff.service';
import { Staff } from './entities/staff.entity';

describe('StaffService', () => {
  let service: StaffService;
  let repo: Repository<Staff>;

  const mockStaffRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        {
          provide: getRepositoryToken(Staff),
          useValue: mockStaffRepo,
        },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
    repo = module.get<Repository<Staff>>(getRepositoryToken(Staff));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // testing findAll() ==========================================================
  it('should return all staff members', async () => {
    const mockStaff = [
      { id: '1', displayName: 'Alice', bufferAfterMinutes: 15 } as Staff,
      { id: '2', displayName: 'Bob', bufferAfterMinutes: 20 } as Staff,
    ];
    mockStaffRepo.find.mockResolvedValue(mockStaff);

    const result = await service.findAll();
    expect(result).toEqual(mockStaff);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.find).toHaveBeenCalled();
  });

  // testing findOne() ==========================================================
  it('should return a staff member by id', async () => {
    const mockStaff = {
      id: '1',
      displayName: 'Alice',
      bufferAfterMinutes: 15,
    } as Staff;
    mockStaffRepo.findOne.mockResolvedValue(mockStaff);

    const result = await service.findOne('1');
    expect(result).toEqual(mockStaff);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
  });

  // edge case: staff not found
  it('should return null if staff not found by id', async () => {
    mockStaffRepo.findOne.mockResolvedValue(null);

    const result = await service.findOne('999');
    expect(result).toBeNull();
  });

  // testing getDefaultStaff() ==========================================================
  it('should return the default staff member', async () => {
    const mockStaff = {
      id: '1',
      displayName: 'Alice',
      bufferAfterMinutes: 15,
    } as Staff;
    mockStaffRepo.findOne.mockResolvedValue(mockStaff);

    const result = await service.getDefaultStaff();
    expect(result).toEqual(mockStaff);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.findOne).toHaveBeenCalledWith({ where: {} });
  });

  it('should throw an error if no staff is available', async () => {
    mockStaffRepo.findOne.mockResolvedValue(null);

    await expect(service.getDefaultStaff()).rejects.toThrow(
      'No staff available',
    );
  });

  // testing getBufferMinutes() ==========================================================
  it('should return buffer minutes for the default staff member', async () => {
    const mockStaff = {
      id: '1',
      displayName: 'Alice',
      bufferAfterMinutes: 15,
    } as Staff;
    mockStaffRepo.findOne.mockResolvedValue(mockStaff);

    const buffer = await service.getBufferMinutes();
    expect(buffer).toBe(15);
  });
});
