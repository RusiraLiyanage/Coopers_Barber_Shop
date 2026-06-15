import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtAuthenticatedRequest } from '../auth/auth.types';
import { AcceptAdminInviteDto } from './dto/accept-admin-invite.dto';
import { CreateAdminInviteDto } from './dto/create-admin-invite.dto';
import {
  AcceptAdminInviteResponse,
  AdminInviteResponse,
  InvitesService,
} from './invites.service';

@ApiTags('invites')
@Controller('admin/invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @ApiOperation({ summary: 'Create an admin invite' })
  @ApiBearerAuth('access-token')
  @ApiBody({ type: CreateAdminInviteDto })
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post()
  createAdminInvite(
    @Body() createAdminInviteDto: CreateAdminInviteDto,
    @Request() request: JwtAuthenticatedRequest,
  ): Promise<AdminInviteResponse> {
    return this.invitesService.createAdminInvite(
      createAdminInviteDto,
      request.user?.userId ?? '',
    );
  }

  @ApiOperation({ summary: 'Accept an admin invite' })
  @ApiBody({ type: AcceptAdminInviteDto })
  @Post('accept')
  acceptAdminInvite(
    @Body() acceptAdminInviteDto: AcceptAdminInviteDto,
  ): Promise<AcceptAdminInviteResponse> {
    return this.invitesService.acceptAdminInvite(acceptAdminInviteDto);
  }
}
