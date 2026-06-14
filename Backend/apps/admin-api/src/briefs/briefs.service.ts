import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppointmentBrief } from '@coopers/entities';

@Injectable()
export class BriefsService {
  constructor(
    @InjectRepository(AppointmentBrief)
    private readonly appointmentBriefRepository: Repository<AppointmentBrief>,
  ) {}

  findAll(): Promise<AppointmentBrief[]> {
    return this.appointmentBriefRepository.find({
      relations: {
        booking: {
          customer: true,
          service: true,
          staff: true,
        },
        barber: true,
      },
      order: {
        generatedAt: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<AppointmentBrief> {
    const appointmentBrief = await this.appointmentBriefRepository.findOne({
      where: { id },
      relations: {
        booking: {
          customer: true,
          service: true,
          staff: true,
        },
        barber: true,
      },
    });

    if (!appointmentBrief) {
      throw new NotFoundException('Appointment brief not found.');
    }

    return appointmentBrief;
  }
}
