import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { createHealthResponse, SkipInternalServiceAuth } from '@coopers/common';
import type { HealthResponse } from '@coopers/common';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @ApiOperation({ summary: 'Check auth-api health' })
  @SkipInternalServiceAuth()
  @Get()
  check(): HealthResponse {
    return createHealthResponse('auth-api');
  }
}
