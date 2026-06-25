import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CacheService,
  createHealthResponse,
  SkipInternalServiceAuth,
} from '@coopers/common';
import type { HealthResponse } from '@coopers/common';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly cacheService: CacheService) {}

  @ApiOperation({ summary: 'Check admin-api health' })
  @SkipInternalServiceAuth()
  @Get()
  async check(): Promise<HealthResponse> {
    return createHealthResponse('admin-api', {
      redis: await this.cacheService.checkHealth(),
    });
  }
}
