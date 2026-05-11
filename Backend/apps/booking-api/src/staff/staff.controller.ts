import { Controller, Get, Param } from '@nestjs/common';
import { StaffService } from './staff.service';
import { Staff } from './entities/staff.entity';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  // Get all staff members.
  @Get()
  findAll(): Promise<Staff[]> {
    return this.staffService.findAll();
  }

  // Get a specific staff member by ID.
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Staff | null> {
    return this.staffService.findOne(id);
  }
}
