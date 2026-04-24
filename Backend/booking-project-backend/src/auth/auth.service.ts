import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from '../users/entities/user.entity';

// This is where the core login logic works.

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // compare the plaintext password with the hashed password.
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...result } = user;
      return result;
    }

    // error handling .. credentials are invalid.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!user || !(await bcrypt.compare(pass, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return null;
  }

  // creates a JWT payload and signs it.
  login(user: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  // register a new user, hash their password, and auto-login.
  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Email already in use');

    const saltRounds = 10;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const newUser = await this.usersService.create({
      email: dto.email,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      passwordHash,
      role: UserRole.CUSTOMER,
    });

    // auto-login after register
    const payload = {
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
    };
    return { access_token: this.jwtService.sign(payload) };
  }
}
