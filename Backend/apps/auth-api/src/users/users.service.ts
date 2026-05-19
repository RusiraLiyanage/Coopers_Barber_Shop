import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '@coopers/entities';

type CreateUserInput = {
  email: string;
  passwordHash: string;
  role?: UserRole;
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
      role: user.role ?? UserRole.CUSTOMER,
    });

    return this.usersRepo.save(newUser);
  }
}
