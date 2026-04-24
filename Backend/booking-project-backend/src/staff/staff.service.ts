import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from './entities/staff.entity';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private staffRepo: Repository<Staff>,
  ) {}

  // Fetch all staff members from the database.
  findAll(): Promise<Staff[]> {
    return this.staffRepo.find();
  }

  // Find a staff member by their ID.
  findOne(id: string): Promise<Staff | null> {
    return this.staffRepo.findOne({ where: { id } });
  }

  // Get the default staff member (first one in the database).
  async getDefaultStaff(): Promise<Staff> {
    const staff = await this.staffRepo.findOne({ where: {} });
    if (!staff) throw new Error('No staff available');
    return staff;
  }

  // Get the buffer time in minutes for the default staff member.
  async getBufferMinutes(): Promise<number> {
    const staff = await this.getDefaultStaff();
    return staff.bufferAfterMinutes;
  }
}
