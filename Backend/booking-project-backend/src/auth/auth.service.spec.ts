import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { BadRequestException } from '@nestjs/common';
import { UserRole } from '../users/entities/user.entity';

jest.mock('bcrypt');

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await service.validateUser('test@example.com', 'password');

    expect(result).toMatchObject({
      id: 'user1',
      email: 'test@example.com',
      role: UserRole.CUSTOMER,
    });
  });

  it('should return null when credentials are invalid', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await service.validateUser('wrong@example.com', 'password');

    expect(result).toBeNull();
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
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 'user1',
      email: 'test@example.com',
      role: UserRole.CUSTOMER,
    });
  });

  // testing register() functionality ================================
  it('should throw error if email is already in use', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    usersService.findByEmail.mockResolvedValue({ id: 'user1' } as any);

    await expect(
      service.register({ email: 'test@example.com', password: '123456' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should register a new user and return an access token', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpw');

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
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(usersService.create).toHaveBeenCalledWith({
      email: 'new@example.com',
      passwordHash: 'hashedpw',
      role: UserRole.CUSTOMER,
    });
  });
});
