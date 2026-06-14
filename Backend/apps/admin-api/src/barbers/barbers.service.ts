import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from '@coopers/entities';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';

@Injectable()
export class BarbersService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

  findAll(): Promise<Staff[]> {
    return this.staffRepository.find({
      order: {
        displayName: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Staff> {
    const staff = await this.staffRepository.findOne({ where: { id } });

    if (!staff) {
      throw new NotFoundException('Barber not found.');
    }

    return staff;
  }

  async create(createBarberDto: CreateBarberDto): Promise<Staff> {
    const staff = this.staffRepository.create(createBarberDto);

    return this.staffRepository.save(staff);
  }

  async update(id: string, updateBarberDto: UpdateBarberDto): Promise<Staff> {
    const staff = await this.staffRepository.preload({
      id,
      ...updateBarberDto,
    });

    if (!staff) {
      throw new NotFoundException('Barber not found.');
    }

    return this.staffRepository.save(staff);
  }
}
