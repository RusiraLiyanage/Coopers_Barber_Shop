import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ProtectedProxyResponse,
  ProtectedProxyService,
} from './protected-proxy.service';

type StatusResponse = {
  status: (statusCode: number) => void;
  setHeader: (name: string, value: string) => void;
};

type AppointmentRequestBody = {
  serviceId: string;
  staffId: string;
  startAt: string;
};

type AvailabilityQuery = {
  serviceId?: string;
  date?: string;
};

function getRefreshToken(
  refreshTokenHeader: string | undefined,
  cookieHeader: string | undefined,
): string | undefined {
  if (refreshTokenHeader) {
    return refreshTokenHeader;
  }

  if (!cookieHeader) {
    return undefined;
  }

  return cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('refresh_token='))
    ?.replace('refresh_token=', '');
}

function writeProxyResponse(
  response: StatusResponse,
  result: ProtectedProxyResponse,
): void {
  response.status(result.statusCode);

  if (result.refreshedTokens) {
    response.setHeader('x-access-token', result.refreshedTokens.access_token);
    response.setHeader('x-refresh-token', result.refreshedTokens.refresh_token);
  }
}

@ApiTags('guard-protected-proxy')
@ApiBearerAuth('access-token')
@Controller('appointments')
export class ProtectedProxyController {
  constructor(private readonly protectedProxyService: ProtectedProxyService) {}

  @ApiOperation({ summary: 'Proxy appointment booking to booking-api' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['serviceId', 'staffId', 'startAt'],
      properties: {
        serviceId: { type: 'string' },
        staffId: { type: 'string' },
        startAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @Post()
  async bookAppointment(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Headers('x-refresh-token') refreshTokenHeader: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Body() body: AppointmentRequestBody,
    @Res({ passthrough: true }) response: StatusResponse,
  ): Promise<unknown> {
    const result = await this.protectedProxyService.forward({
      authorizationHeader,
      refreshToken: getRefreshToken(refreshTokenHeader, cookieHeader),
      method: 'POST',
      path: '/appointments',
      body,
    });

    writeProxyResponse(response, result);

    return result.body;
  }

  @ApiOperation({
    summary: 'Proxy authenticated customer appointments to booking-api',
  })
  @Get('all')
  async findMyAppointments(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Headers('x-refresh-token') refreshTokenHeader: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: StatusResponse,
  ): Promise<unknown> {
    const result = await this.protectedProxyService.forward({
      authorizationHeader,
      refreshToken: getRefreshToken(refreshTokenHeader, cookieHeader),
      method: 'GET',
      path: '/appointments/all',
    });

    writeProxyResponse(response, result);

    return result.body;
  }

  @ApiOperation({
    summary: 'Proxy authenticated availability lookup to booking-api',
  })
  @Get('availability')
  async findAvailability(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Headers('x-refresh-token') refreshTokenHeader: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Query() query: AvailabilityQuery,
    @Res({ passthrough: true }) response: StatusResponse,
  ): Promise<unknown> {
    const result = await this.protectedProxyService.forward({
      authorizationHeader,
      refreshToken: getRefreshToken(refreshTokenHeader, cookieHeader),
      method: 'GET',
      path: '/appointments/availability',
      query,
    });

    writeProxyResponse(response, result);

    return result.body;
  }
}
