import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@coopers/entities';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import {
  AccessTokenResponse,
  AuthenticatedUser,
  JwtTokenService,
  PasswordService,
} from '@coopers/common';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly jwtTokenService: JwtTokenService,
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

  login(user: AuthenticatedUser): AccessTokenResponse {
    return this.jwtTokenService.signAccessToken(user);
  }

  async register(dto: RegisterDto): Promise<AccessTokenResponse> {
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
}
