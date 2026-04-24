import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private serviceRepo: Repository<Service>,
  ) {}

  // Fetch all active services from the database.
  findAll(): Promise<Service[]> {
    return this.serviceRepo.find({ where: { isActive: true } });
  }

  // Find a service by its ID.
  findOne(id: string): Promise<Service | null> {
    return this.serviceRepo.findOne({ where: { id } });
  }
}
