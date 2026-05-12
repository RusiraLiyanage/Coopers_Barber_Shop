import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@coopers/entities';
jest.mock('bcrypt');

const mockedBcryptCompare = bcrypt.compare as jest.MockedFunction<
  (data: string, encrypted: string) => Promise<boolean>
>;
const mockedBcryptHash = bcrypt.hash as jest.MockedFunction<
  (data: string, saltOrRounds: string | number) => Promise<string>
>;

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // testing validateUser() ==========================================================
  it('should return user without passwordHash when credentials are valid', async () => {
    const mockUser = {
      id: 'user1',
      email: 'test@example.com',
      passwordHash: 'hashedpw',
      role: UserRole.CUSTOMER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    usersService.findByEmail.mockResolvedValue(mockUser);
    mockedBcryptCompare.mockResolvedValue(true);

    const result = await service.validateUser('test@example.com', 'password');

    expect(result).toMatchObject({
      id: 'user1',
      email: 'test@example.com',
      role: UserRole.CUSTOMER,
    });
  });

  it('should throw UnauthorizedException when credentials are invalid', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.validateUser('wrong@example.com', 'password'),
    ).rejects.toThrow(UnauthorizedException);
  });

  // testing login() =============================================
  it('should return an access_token on login', () => {
    const mockUser = {
      id: 'user1',
      email: 'test@example.com',
      role: UserRole.CUSTOMER,
    };
    jwtService.sign.mockReturnValue('mocked.jwt.token');

    const result = service.login(mockUser);

    expect(result).toEqual({ access_token: 'mocked.jwt.token' });
    expect(jwtService.sign.mock.calls).toContainEqual([
      {
        sub: 'user1',
        email: 'test@example.com',
        role: UserRole.CUSTOMER,
      },
    ]);
  });

  // testing register() functionality ================================
  it('should throw error if email is already in use', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user1',
      email: 'test@example.com',
      passwordHash: 'hashedpw',
      role: UserRole.CUSTOMER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.register({ email: 'test@example.com', password: '123456' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should register a new user and return an access token', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    mockedBcryptHash.mockResolvedValue('hashedpw');

    const mockUser = {
      id: 'user2',
      email: 'new@example.com',
      passwordHash: 'hashedpw',
      role: UserRole.CUSTOMER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    usersService.create.mockResolvedValue(mockUser);
    jwtService.sign.mockReturnValue('mocked.jwt.token');

    const result = await service.register({
      email: 'new@example.com',
      password: 'mypassword',
    });

    expect(result).toEqual({ access_token: 'mocked.jwt.token' });
    expect(usersService.create.mock.calls).toContainEqual([
      {
        email: 'new@example.com',
        passwordHash: 'hashedpw',
        role: UserRole.CUSTOMER,
      },
    ]);
  });
});
