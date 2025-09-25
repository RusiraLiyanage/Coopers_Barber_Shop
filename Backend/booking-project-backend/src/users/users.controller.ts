import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

// This controller handles HTTP requests related to user management.

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Fetch all users.
  @Get()
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  // Find a user by their email address.
  @Get(':email')
  async findByEmail(@Param('email') email: string): Promise<User | null> {
    return this.usersService.findByEmail(email);
  }

  // Create a new user.
  @Post('create-user')
  async create(@Body() dto: CreateUserDto): Promise<User> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Email already registered');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const crypto = await import('crypto');
    // Hash the password using SHA-256
    const passwordHash = crypto
      .createHash('sha256')
      .update(dto.password)
      .digest('hex');

    // Create the user with a default role of CUSTOMER.
    return this.usersService.create({
      email: dto.email,
      passwordHash,
      role: UserRole.CUSTOMER, // default role
    });
  }
}
