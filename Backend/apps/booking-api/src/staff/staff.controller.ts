import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { Staff } from '@coopers/entities';

@ApiTags('staff')
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  // Get all staff members.
  @ApiOperation({ summary: 'Get all staff members' })
  @Get()
  findAll(): Promise<Staff[]> {
    return this.staffService.findAll();
  }

  // Get a specific staff member by ID.
  @ApiOperation({ summary: 'Get a staff member by ID' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Staff | null> {
    return this.staffService.findOne(id);
  }
}
