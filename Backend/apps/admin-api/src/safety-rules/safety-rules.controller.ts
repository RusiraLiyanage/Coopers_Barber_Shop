import {
  Body,
  Controller,
  Get,
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
import { SafetyRule } from '@coopers/entities';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSafetyRuleDto } from './dto/create-safety-rule.dto';
import { UpdateSafetyRuleDto } from './dto/update-safety-rule.dto';
import { SafetyRulesService } from './safety-rules.service';

@ApiTags('safety-rules')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/safety-rules')
export class SafetyRulesController {
  constructor(private readonly safetyRulesService: SafetyRulesService) {}

  @ApiOperation({ summary: 'List safety rules' })
  @Get()
  findAll(): Promise<SafetyRule[]> {
    return this.safetyRulesService.findAll();
  }

  @ApiOperation({ summary: 'Get a safety rule' })
  @ApiParam({ name: 'id' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<SafetyRule> {
    return this.safetyRulesService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a safety rule' })
  @Post()
  create(
    @Body() createSafetyRuleDto: CreateSafetyRuleDto,
  ): Promise<SafetyRule> {
    return this.safetyRulesService.create(createSafetyRuleDto);
  }

  @ApiOperation({ summary: 'Update a safety rule' })
  @ApiParam({ name: 'id' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSafetyRuleDto: UpdateSafetyRuleDto,
  ): Promise<SafetyRule> {
    return this.safetyRulesService.update(id, updateSafetyRuleDto);
  }
}
