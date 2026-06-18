import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HairHistory } from '@coopers/entities';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginatedResult } from '../common/pagination.dto';
import { CreateHairHistoryDto } from './dto/create-hair-history.dto';
import { HairHistoryQueryDto } from './dto/hair-history-query.dto';
import { HairHistoryService } from './hair-history.service';

@ApiTags('hair-history')
@ApiBearerAuth('access-token')
@Controller('admin/hair-history')
export class HairHistoryController {
  constructor(private readonly hairHistoryService: HairHistoryService) {}

  @ApiOperation({ summary: 'List client hair history records' })
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Get()
  findAll(
    @Query() query: HairHistoryQueryDto,
  ): Promise<PaginatedResult<HairHistory>> {
    return this.hairHistoryService.findAll(query);
  }

  @ApiOperation({ summary: 'Create a client hair history record' })
  @ApiBody({ type: CreateHairHistoryDto })
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post()
  create(
    @Body() createHairHistoryDto: CreateHairHistoryDto,
  ): Promise<HairHistory> {
    return this.hairHistoryService.create(createHairHistoryDto);
  }

  @ApiOperation({
    summary: 'Create a client hair history record from an internal agent',
  })
  @ApiBody({ type: CreateHairHistoryDto })
  @Post('internal')
  createInternal(
    @Body() createHairHistoryDto: CreateHairHistoryDto,
  ): Promise<HairHistory> {
    return this.hairHistoryService.create(createHairHistoryDto);
  }

  @ApiOperation({ summary: 'Read client hair history from an internal agent' })
  @Get('internal')
  findAllInternal(@Query() query: HairHistoryQueryDto): Promise<HairHistory[]> {
    return this.hairHistoryService.findAllRecords(query);
  }
}
