import { Controller, Get } from '@nestjs/common';
import { createHealthResponse } from '@coopers/common';
import type { HealthResponse } from '@coopers/common';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return createHealthResponse('booking-api');
  }
}
