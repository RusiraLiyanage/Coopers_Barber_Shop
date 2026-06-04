import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { User, UserRole } from '@coopers/entities';
import { CreateUserDto } from './dto/create-user.dto';

// This controller handles HTTP requests related to user management.

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Fetch all users.
  @ApiOperation({ summary: 'Get all users' })
  @Get()
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  // Find a user by their email address.
  @ApiOperation({ summary: 'Get a user by email address' })
  @Get(':email')
  async findByEmail(@Param('email') email: string): Promise<User | null> {
    return this.usersService.findByEmail(email);
  }

  // Create a new user.
  @ApiOperation({ summary: 'Create a customer user' })
  @Post('create-user')
  async create(@Body() dto: CreateUserDto): Promise<User> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Email already registered');

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
      firstName: dto.firstName,
      lastName: dto.lastName,
      mobile: dto.mobile,
      suburb: dto.suburb,
      role: UserRole.CUSTOMER, // default role
    });
  }
}
