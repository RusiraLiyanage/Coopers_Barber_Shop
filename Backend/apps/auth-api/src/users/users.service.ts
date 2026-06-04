import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '@coopers/entities';

type CreateUserInput = {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  suburb?: string;
  role?: UserRole;
};

type UpdateUserAccountInput = {
  email: string;
  firstName: string;
  lastName: string;
  mobile: string;
  suburb: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { email },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { id },
    });
  }

  async create(user: CreateUserInput): Promise<User> {
    const existingUser = await this.findByEmail(user.email);

    if (existingUser) {
      throw new BadRequestException(
        `Email ${user.email} is already registered`,
      );
    }

    const newUser = this.usersRepo.create({
      email: user.email,
      passwordHash: user.passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      mobile: user.mobile,
      suburb: user.suburb,
      role: user.role ?? UserRole.CUSTOMER,
    });

    return this.usersRepo.save(newUser);
  }

  async updateAccount(
    userId: string,
    input: UpdateUserAccountInput,
  ): Promise<User> {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundException('User account was not found');
    }

    const existingEmailUser = await this.findByEmail(input.email);

    if (existingEmailUser && existingEmailUser.id !== userId) {
      throw new ConflictException('Email already in use');
    }

    user.email = input.email;
    user.firstName = input.firstName;
    user.lastName = input.lastName;
    user.mobile = input.mobile;
    user.suburb = input.suburb;

    return this.usersRepo.save(user);
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.usersRepo.update(userId, {
      passwordHash,
    });
  }
}
