import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { User, UserRole } from '@coopers/entities';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import {
  AuthenticatedUser,
  AuthTokensResponse,
  JwtTokenService,
  LogoutResponse,
  PasswordService,
  SessionService,
  SessionValidationResponse,
} from '@coopers/common';
import { UpdateAccountDto } from './dto/update-account.dto';

export type AccountProfileResponse = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  mobile: string | null;
  suburb: string | null;
  role: UserRole;
};

function toAccountProfile(user: User): AccountProfileResponse {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    mobile: user.mobile,
    suburb: user.suburb,
    role: user.role,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly sessionService: SessionService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<AuthenticatedUser> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await this.passwordService.compare(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  async login(user: AuthenticatedUser): Promise<AuthTokensResponse> {
    return this.createSessionTokens(user);
  }

  async register(dto: RegisterDto): Promise<AuthTokensResponse> {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      mobile: dto.mobile,
      suburb: dto.suburb,
      role: UserRole.CUSTOMER,
    });

    return this.login({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }

  async refresh(refreshToken: string): Promise<AuthTokensResponse> {
    const currentSession =
      await this.sessionService.findActiveSession(refreshToken);
    const user = currentSession.user;

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const newRefreshToken = this.jwtTokenService.generateRefreshToken();

    const newSession = await this.sessionService.rotateSession({
      currentRefreshToken: refreshToken,
      newRefreshToken: newRefreshToken.refresh_token,
    });

    return {
      ...this.jwtTokenService.signAccessToken(authenticatedUser, newSession.id),
      ...newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<LogoutResponse> {
    await this.sessionService.revokeSession(refreshToken);

    return {
      success: true,
    };
  }

  async validateSession(sessionId: string): Promise<SessionValidationResponse> {
    return {
      active: await this.sessionService.isSessionActive(sessionId),
    };
  }

  async getAccountProfile(userId: string): Promise<AccountProfileResponse> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('User account was not found');
    }

    return toAccountProfile(user);
  }

  async updateAccountProfile(
    userId: string,
    dto: UpdateAccountDto,
  ): Promise<AccountProfileResponse> {
    const user = await this.usersService.updateAccount(userId, {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      mobile: dto.mobile,
      suburb: dto.suburb,
    });

    return toAccountProfile(user);
  }

  private async createSessionTokens(
    user: AuthenticatedUser,
  ): Promise<AuthTokensResponse> {
    const refreshToken = this.jwtTokenService.generateRefreshToken();

    const session = await this.sessionService.createSession({
      userId: user.id,
      refreshToken: refreshToken.refresh_token,
    });

    return {
      ...this.jwtTokenService.signAccessToken(user, session.id),
      ...refreshToken,
    };
  }
}
