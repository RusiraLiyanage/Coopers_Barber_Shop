import { Controller, Get, Param } from '@nestjs/common';
import { ServicesService } from './services.service';
import { Service } from './entities/service.entity';

// Controller to handle service-related API endpoints.

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // Get all active services.
  @Get()
  async findAll(): Promise<Service[]> {
    return this.servicesService.findAll();
  }

  // Get a specific service by ID.
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Service | null> {
    return this.servicesService.findOne(id);
  }
}
