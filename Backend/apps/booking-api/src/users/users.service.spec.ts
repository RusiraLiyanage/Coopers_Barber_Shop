import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { Repository } from 'typeorm';

describe('UsersService', () => {
  // instance of the users service
  let service: UsersService;
  // defining the mock repository
  let repo: jest.Mocked<Repository<User>>;

  // mock user data
  const mockUsers: User[] = [
    {
      id: '1',
      email: 'alice@example.com',
      passwordHash: 'hashedpass1',
      role: UserRole.CUSTOMER,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      email: 'bob@example.com',
      passwordHash: 'hashedpass2',
      role: UserRole.ADMIN,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // setting up the testing module and mocking the repository methods
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    // getting instances of the service and the mocked repository
    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  // Clears the call history and usage data of all Jest mocks.
  afterEach(() => {
    jest.clearAllMocks();
  });

  // testing findAll() ==========================================================
  it('should return all users', async () => {
    // mocking the find method to return the mockUsers array
    repo.find.mockResolvedValue(mockUsers);

    // calling the service method
    const result = await service.findAll();
    expect(result).toEqual(mockUsers);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.find).toHaveBeenCalled();
  });

  // testing findByEmail() ==========================================================
  it('should return a user by email', async () => {
    // mocking the findOne method to return the first user when searched by email
    repo.findOne.mockResolvedValue(mockUsers[0]);

    // calling the service method
    const result = await service.findByEmail('alice@example.com');
    expect(result).toEqual(mockUsers[0]);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { email: 'alice@example.com' },
    });
  });

  // edge case: user not found
  it('should return null if user not found by email', async () => {
    repo.findOne.mockResolvedValue(null);

    const result = await service.findByEmail('unknown@example.com');
    expect(result).toBeNull();
  });

  // testing create() ==========================================================
  it('should create a new user with default role if none provided', async () => {
    const input = { email: 'new@example.com', passwordHash: 'hash' };
    const createdUser = { ...input, id: '3', role: UserRole.CUSTOMER };

    repo.create.mockReturnValue(createdUser as User);
    repo.save.mockResolvedValue(createdUser as User);

    const result = await service.create(input);

    expect(result.role).toBe(UserRole.CUSTOMER);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.create).toHaveBeenCalledWith({
      ...input,
      role: UserRole.CUSTOMER,
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.save).toHaveBeenCalledWith(createdUser);
  });

  // testing create() with provided role
  it('should create a new user with provided role', async () => {
    const input = {
      email: 'admin@example.com',
      passwordHash: 'hash',
      role: UserRole.ADMIN,
    };
    const createdUser = { ...input, id: '4' };

    repo.create.mockReturnValue(createdUser as User);
    repo.save.mockResolvedValue(createdUser as User);

    const result = await service.create(input);

    expect(result.role).toBe(UserRole.ADMIN);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.create).toHaveBeenCalledWith(input);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.save).toHaveBeenCalledWith(createdUser);
  });
});
