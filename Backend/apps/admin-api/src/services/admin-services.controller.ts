import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Service } from '@coopers/entities';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginatedResult, PagingReqDto } from '../common/pagination.dto';
import { AdminServicesService } from './admin-services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceAiConfigDto } from './dto/update-service-ai-config.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@ApiTags('admin-services')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/services')
export class AdminServicesController {
  constructor(private readonly adminServicesService: AdminServicesService) {}

  @ApiOperation({ summary: 'Create a booking service' })
  @Post()
  create(@Body() createServiceDto: CreateServiceDto): Promise<Service> {
    return this.adminServicesService.create(createServiceDto);
  }

  @ApiOperation({ summary: 'List services with AI configuration' })
  @Get()
  findAll(
    @Query() pagination: PagingReqDto,
  ): Promise<PaginatedResult<Service>> {
    return this.adminServicesService.findAll(pagination);
  }

  @ApiOperation({ summary: 'Get service AI configuration' })
  @ApiParam({ name: 'id' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Service> {
    return this.adminServicesService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a booking service' })
  @ApiParam({ name: 'id' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ): Promise<Service> {
    return this.adminServicesService.update(id, updateServiceDto);
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
