import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Staff } from '@coopers/entities';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BarbersService, DeleteBarberResponse } from './barbers.service';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';

@ApiTags('barbers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/barbers')
export class BarbersController {
  constructor(private readonly barbersService: BarbersService) {}

  @ApiOperation({ summary: 'List barber profiles' })
  @Get()
  findAll(): Promise<Staff[]> {
    return this.barbersService.findAll();
  }

  @ApiOperation({ summary: 'Get a barber profile' })
  @ApiParam({ name: 'id' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Staff> {
    return this.barbersService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a barber profile' })
  @Post()
  create(@Body() createBarberDto: CreateBarberDto): Promise<Staff> {
    return this.barbersService.create(createBarberDto);
  }

  @ApiOperation({ summary: 'Update a barber profile' })
  @ApiParam({ name: 'id' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBarberDto: UpdateBarberDto,
  ): Promise<Staff> {
    return this.barbersService.update(id, updateBarberDto);
  }

  @ApiOperation({ summary: 'Delete a barber profile' })
  @ApiParam({ name: 'id' })
  @Delete(':id')
  @HttpCode(200)
  delete(@Param('id') id: string): Promise<DeleteBarberResponse> {
    return this.barbersService.delete(id);
  }
}
