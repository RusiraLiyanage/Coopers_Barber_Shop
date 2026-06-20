import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AdminDataVersionResponse,
  DataVersionService,
} from './data-version.service';

@ApiTags('admin-data-version')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/data-version')
export class DataVersionController {
  constructor(private readonly dataVersionService: DataVersionService) {}

  @ApiOperation({ summary: 'Get latest admin-visible data version' })
  @Get()
  getVersion(): Promise<AdminDataVersionResponse> {
    return this.dataVersionService.getVersion();
  }
}
