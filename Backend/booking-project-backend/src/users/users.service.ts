import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';

// the service that contains the business logic for user management.

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  // Fetch all users from the database.
  findAll(): Promise<User[]> {
    return this.usersRepo.find();
  }

  // Find a user by their email address.
  findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  // Create a new user with the provided details.
  async create(user: Partial<User>): Promise<User> {
    if (!user.role) {
      user.role = UserRole.CUSTOMER;
    }

    const existing = await this.usersRepo.findOne({
      where: { email: user.email },
    });
    if (existing) {
      throw new BadRequestException(
        `Email ${user.email} is already registered`,
      );
    }
    const newUser = this.usersRepo.create(user);
    return this.usersRepo.save(newUser);
  }
}
