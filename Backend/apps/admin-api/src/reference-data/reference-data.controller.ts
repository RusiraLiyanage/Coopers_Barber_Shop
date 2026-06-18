import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ReferenceDataItem, ReferenceDataType } from '@coopers/entities';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginatedResult } from '../common/pagination.dto';
import { CreateReferenceDataItemDto } from './dto/create-reference-data-item.dto';
import { ReferenceDataQueryDto } from './dto/reference-data-query.dto';
import { UpdateReferenceDataItemDto } from './dto/update-reference-data-item.dto';
import {
  DeleteReferenceDataItemResponse,
  ReferenceDataService,
} from './reference-data.service';

@ApiTags('admin-reference-data')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/reference-data')
export class ReferenceDataController {
  constructor(private readonly referenceDataService: ReferenceDataService) {}

  @ApiOperation({ summary: 'List admin-managed reference data items' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ReferenceDataType,
  })
  @Get()
  findAll(
    @Query() query: ReferenceDataQueryDto,
  ): Promise<PaginatedResult<ReferenceDataItem>> {
    return this.referenceDataService.findAll(query);
  }

  @ApiOperation({ summary: 'Create a reference data item' })
  @Post()
  create(
    @Body() createReferenceDataItemDto: CreateReferenceDataItemDto,
  ): Promise<ReferenceDataItem> {
    return this.referenceDataService.create(createReferenceDataItemDto);
  }

  @ApiOperation({ summary: 'Update a reference data item label' })
  @ApiParam({ name: 'id' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateReferenceDataItemDto: UpdateReferenceDataItemDto,
  ): Promise<ReferenceDataItem> {
    return this.referenceDataService.update(id, updateReferenceDataItemDto);
  }

  @ApiOperation({
    summary: 'Delete a reference data item and remove it from linked records',
  })
  @ApiParam({ name: 'id' })
  @Delete(':id')
  delete(@Param('id') id: string): Promise<DeleteReferenceDataItemResponse> {
    return this.referenceDataService.delete(id);
  }
}
