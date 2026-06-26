import {
  Body,
  Controller,
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
  ApiTags,
} from '@nestjs/swagger';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginatedResult, PagingReqDto } from '../common/pagination.dto';
import { CreateSafetyRuleDto } from './dto/create-safety-rule.dto';
import { UpdateSafetyRuleDto } from './dto/update-safety-rule.dto';
import {
  SafetyRuleResponse,
  SafetyRulesService,
} from './safety-rules.service';

@ApiTags('safety-rules')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/safety-rules')
export class SafetyRulesController {
  constructor(private readonly safetyRulesService: SafetyRulesService) {}

  @ApiOperation({ summary: 'List safety rules' })
  @Get()
  findAll(
    @Query() pagination: PagingReqDto,
  ): Promise<PaginatedResult<SafetyRuleResponse>> {
    return this.safetyRulesService.findAll(pagination);
  }

  @ApiOperation({ summary: 'Get a safety rule' })
  @ApiParam({ name: 'id' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<SafetyRuleResponse> {
    return this.safetyRulesService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a safety rule' })
  @Post()
  create(
    @Body() createSafetyRuleDto: CreateSafetyRuleDto,
  ): Promise<SafetyRuleResponse> {
    return this.safetyRulesService.create(createSafetyRuleDto);
  }

  @ApiOperation({ summary: 'Update a safety rule' })
  @ApiParam({ name: 'id' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSafetyRuleDto: UpdateSafetyRuleDto,
  ): Promise<SafetyRuleResponse> {
    return this.safetyRulesService.update(id, updateSafetyRuleDto);
  }
}
