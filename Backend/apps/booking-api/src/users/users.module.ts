import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordService } from '@coopers/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '@coopers/entities';

@Module({
  imports: [TypeOrmModule.forFeature([User])], // register User entity
  providers: [UsersService, PasswordService], // the logic for the user's APIs are written here.
  controllers: [UsersController], // the API endpoints are defined here.
  exports: [UsersService], // export service for AuthModule later
})
export class UsersModule {}
