import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AppointmentBrief } from '@coopers/entities';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BriefsService } from './briefs.service';

@ApiTags('briefs')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/briefs')
export class BriefsController {
  constructor(private readonly briefsService: BriefsService) {}

  @ApiOperation({ summary: 'List generated appointment briefs' })
  @Get()
  findAll(): Promise<AppointmentBrief[]> {
    return this.briefsService.findAll();
  }

  @ApiOperation({ summary: 'Get a generated appointment brief' })
  @ApiParam({ name: 'id' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<AppointmentBrief> {
    return this.briefsService.findOne(id);
  }
}
