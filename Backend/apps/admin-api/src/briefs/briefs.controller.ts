import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginatedResult } from '../common/pagination.dto';
import { AppointmentBriefResponse, BriefsService } from './briefs.service';
import { BriefsQueryDto } from './dto/briefs-query.dto';
import { CreateBriefDto } from './dto/create-brief.dto';

@ApiTags('briefs')
@ApiBearerAuth('access-token')
@Controller('admin/briefs')
export class BriefsController {
  constructor(private readonly briefsService: BriefsService) {}

  @ApiOperation({ summary: 'List generated appointment briefs' })
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Get()
  findAll(
    @Query() query: BriefsQueryDto,
  ): Promise<PaginatedResult<AppointmentBriefResponse>> {
    return this.briefsService.findAll(query);
  }

  @ApiOperation({ summary: 'Get a generated appointment brief' })
  @ApiParam({ name: 'id' })
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Get(':id')
  findOne(@Param('id') id: string): Promise<AppointmentBriefResponse> {
    return this.briefsService.findOne(id);
  }

  @ApiOperation({
    summary: 'Create an appointment brief from an internal agent',
  })
  @ApiBody({ type: CreateBriefDto })
  @Post('internal')
  create(
    @Body() createBriefDto: CreateBriefDto,
  ): Promise<AppointmentBriefResponse> {
    return this.briefsService.create(createBriefDto);
  }
}
