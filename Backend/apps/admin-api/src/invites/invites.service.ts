import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { PasswordService } from '@coopers/common';
import { InviteToken, User, UserRole } from '@coopers/entities';
import { AcceptAdminInviteDto } from './dto/accept-admin-invite.dto';
import { CreateAdminInviteDto } from './dto/create-admin-invite.dto';

export type AdminInviteResponse = {
  token: string;
  email: string;
  role: UserRole;
  expiresAt: Date;
};

export type AcceptAdminInviteResponse = {
  success: true;
  email: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);

  return result;
}

function optionalText(value: string | undefined): string | null {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(InviteToken)
    private readonly inviteTokenRepository: Repository<InviteToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly passwordService: PasswordService,
  ) {}

  async createAdminInvite(
    createAdminInviteDto: CreateAdminInviteDto,
    invitedByUserId: string,
  ): Promise<AdminInviteResponse> {
    const email = normalizeEmail(createAdminInviteDto.email);
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('An account already exists for this email.');
    }

    const existingInvite = await this.inviteTokenRepository.findOne({
      where: {
        email,
        used: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (existingInvite) {
      return {
        token: existingInvite.token,
        email: existingInvite.email,
        role: existingInvite.role,
        expiresAt: existingInvite.expiresAt,
      };
    }

    const invitedBy = await this.userRepository.findOne({
      where: { id: invitedByUserId },
    });

    if (!invitedBy) {
      throw new NotFoundException('Inviting admin account not found.');
    }

    const inviteToken = this.inviteTokenRepository.create({
      email,
      role: UserRole.ADMIN,
      invitedBy,
      expiresAt: addDays(new Date(), createAdminInviteDto.expiresInDays ?? 7),
      used: false,
      usedAt: null,
      acceptedUser: null,
    });
    const savedInvite = await this.inviteTokenRepository.save(inviteToken);

    return {
      token: savedInvite.token,
      email: savedInvite.email,
      role: savedInvite.role,
      expiresAt: savedInvite.expiresAt,
    };
  }

  async acceptAdminInvite(
    acceptAdminInviteDto: AcceptAdminInviteDto,
  ): Promise<AcceptAdminInviteResponse> {
    const inviteToken = await this.inviteTokenRepository.findOne({
      where: {
        token: acceptAdminInviteDto.token,
      },
      relations: {
        acceptedUser: true,
      },
    });

    if (!inviteToken || inviteToken.used || inviteToken.usedAt) {
      throw new NotFoundException('Invite token is invalid or already used.');
    }

    if (inviteToken.expiresAt <= new Date()) {
      throw new BadRequestException('Invite token has expired.');
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: inviteToken.email },
    });

    if (existingUser) {
      throw new ConflictException('An account already exists for this email.');
    }

    const user = this.userRepository.create({
      email: inviteToken.email,
      passwordHash: await this.passwordService.hash(
        acceptAdminInviteDto.password,
      ),
      firstName: optionalText(acceptAdminInviteDto.firstName),
      lastName: optionalText(acceptAdminInviteDto.lastName),
      mobile: optionalText(acceptAdminInviteDto.mobile),
      suburb: optionalText(acceptAdminInviteDto.suburb),
      role: UserRole.ADMIN,
    });
    const savedUser = await this.userRepository.save(user);

    inviteToken.used = true;
    inviteToken.usedAt = new Date();
    inviteToken.acceptedUser = savedUser;
    await this.inviteTokenRepository.save(inviteToken);

    return {
      success: true,
      email: savedUser.email,
    };
  }
}
