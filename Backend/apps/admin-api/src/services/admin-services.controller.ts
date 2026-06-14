import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Service } from '@coopers/entities';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminServicesService } from './admin-services.service';
import { UpdateServiceAiConfigDto } from './dto/update-service-ai-config.dto';

@ApiTags('admin-services')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/services')
export class AdminServicesController {
  constructor(private readonly adminServicesService: AdminServicesService) {}

  @ApiOperation({ summary: 'List services with AI configuration' })
  @Get()
  findAll(): Promise<Service[]> {
    return this.adminServicesService.findAll();
  }

  @ApiOperation({ summary: 'Get service AI configuration' })
  @ApiParam({ name: 'id' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Service> {
    return this.adminServicesService.findOne(id);
  }

  @ApiOperation({ summary: 'Update service AI configuration' })
  @ApiParam({ name: 'id' })
  @Patch(':id/ai-config')
  updateAiConfig(
    @Param('id') id: string,
    @Body() updateServiceAiConfigDto: UpdateServiceAiConfigDto,
  ): Promise<Service> {
    return this.adminServicesService.updateAiConfig(
      id,
      updateServiceAiConfigDto,
    );
  }
}
