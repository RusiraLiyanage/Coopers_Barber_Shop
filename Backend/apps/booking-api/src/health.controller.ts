import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { createHealthResponse } from '@coopers/common';
import type { HealthResponse } from '@coopers/common';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @ApiOperation({ summary: 'Check booking-api health' })
  @Get()
  check(): HealthResponse {
    return createHealthResponse('booking-api');
  }
}
