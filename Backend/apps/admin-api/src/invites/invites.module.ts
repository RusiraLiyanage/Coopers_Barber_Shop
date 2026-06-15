import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordService } from '@coopers/common';
import { InviteToken, User } from '@coopers/entities';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';

@Module({
  imports: [AdminAuthModule, TypeOrmModule.forFeature([InviteToken, User])],
  controllers: [InvitesController],
  providers: [InvitesService, PasswordService],
})
export class InvitesModule {}
