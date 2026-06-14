import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from '@coopers/entities';
import { UpdateServiceAiConfigDto } from './dto/update-service-ai-config.dto';

@Injectable()
export class AdminServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,
  ) {}

  findAll(): Promise<Service[]> {
    return this.servicesRepository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Service> {
    const service = await this.servicesRepository.findOne({ where: { id } });

    if (!service) {
      throw new NotFoundException('Service not found.');
    }

    return service;
  }

  async updateAiConfig(
    id: string,
    updateServiceAiConfigDto: UpdateServiceAiConfigDto,
  ): Promise<Service> {
    const service = await this.servicesRepository.preload({
      id,
      ...updateServiceAiConfigDto,
    });

    if (!service) {
      throw new NotFoundException('Service not found.');
    }

    return this.servicesRepository.save(service);
  }
}
