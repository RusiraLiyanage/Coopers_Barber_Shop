import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@coopers/entities';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import {
  AuthenticatedUser,
  AuthTokensResponse,
  JwtTokenService,
  LogoutResponse,
  PasswordService,
  SessionService,
} from '@coopers/common';

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
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
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

    const tokens = this.jwtTokenService.createAuthTokens(authenticatedUser);

    await this.sessionService.rotateSession({
      currentRefreshToken: refreshToken,
      newRefreshToken: tokens.refresh_token,
    });

    return tokens;
  }

  async logout(refreshToken: string): Promise<LogoutResponse> {
    await this.sessionService.revokeSession(refreshToken);

    return {
      success: true,
    };
  }

  private async createSessionTokens(
    user: AuthenticatedUser,
  ): Promise<AuthTokensResponse> {
    const tokens = this.jwtTokenService.createAuthTokens(user);

    await this.sessionService.createSession({
      userId: user.id,
      refreshToken: tokens.refresh_token,
    });

    return tokens;
  }
}
