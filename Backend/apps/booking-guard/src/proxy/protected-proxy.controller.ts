import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ProtectedProxyResponse,
  ProtectedProxyService,
} from './protected-proxy.service';
import {
  AuthCookieResponse,
  getAuthorizationHeaderFromRequest,
  getRememberMeFromCookie,
  setAuthCookies,
} from './auth-cookie.util';
import { getRefreshTokenFromRequest } from './refresh-token.util';

type AppointmentRequestBody = {
  serviceId: string;
  staffId?: string;
  date: string;
  slot: string;
  consultationSummary?: string;
  safetyNotes?: string;
  hairState?: string[];
  desiredLook?: string;
  goalPhoto?: {
    mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
    data: string;
  };
  consultationGenerationSource?: 'claude' | 'fallback';
  consultationGenerationModel?: string;
};

type UpdateAppointmentRequestBody = {
  slot: string;
};

type AvailabilityQuery = {
  serviceId?: string;
  date?: string;
  staffId?: string;
  excludeAppointmentId?: string;
};

function writeProxyResponse(
  response: AuthCookieResponse,
  result: ProtectedProxyResponse,
  rememberMe: boolean,
): void {
  response.status(result.statusCode);

  if (result.refreshedTokens) {
    setAuthCookies(response, result.refreshedTokens, { rememberMe });
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
      required: ['serviceId', 'date', 'slot'],
      properties: {
        serviceId: { type: 'string' },
        staffId: { type: 'string' },
        date: { type: 'string', format: 'date' },
        slot: { type: 'string' },
        consultationSummary: { type: 'string' },
        safetyNotes: { type: 'string' },
        hairState: {
          type: 'array',
          items: { type: 'string' },
        },
        desiredLook: { type: 'string' },
        goalPhoto: {
          type: 'object',
          required: ['mediaType', 'data'],
          properties: {
            mediaType: {
              type: 'string',
              enum: ['image/jpeg', 'image/png', 'image/webp'],
            },
            data: {
              type: 'string',
              description: 'Base64-encoded image data without a data URL prefix.',
            },
          },
        },
        consultationGenerationSource: {
          type: 'string',
          enum: ['claude', 'fallback'],
        },
        consultationGenerationModel: { type: 'string' },
      },
    },
  })
  @Post()
  async bookAppointment(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Headers('x-refresh-token') refreshTokenHeader: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Body() body: AppointmentRequestBody,
    @Res({ passthrough: true }) response: AuthCookieResponse,
  ): Promise<unknown> {
    const result = await this.protectedProxyService.forward({
      authorizationHeader: getAuthorizationHeaderFromRequest(
        authorizationHeader,
        cookieHeader,
      ),
      refreshToken: getRefreshTokenFromRequest(
        refreshTokenHeader,
        cookieHeader,
      ),
      method: 'POST',
      path: '/appointments',
      body,
    });

    writeProxyResponse(
      response,
      result,
      getRememberMeFromCookie(cookieHeader) ?? false,
    );

    return result.body;
  }

  @ApiOperation({ summary: 'Proxy appointment time update to booking-api' })
  @Patch(':id')
  async updateAppointmentTime(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Headers('x-refresh-token') refreshTokenHeader: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Param('id') appointmentId: string,
    @Body() body: UpdateAppointmentRequestBody,
    @Res({ passthrough: true }) response: AuthCookieResponse,
  ): Promise<unknown> {
    const result = await this.protectedProxyService.forward({
      authorizationHeader: getAuthorizationHeaderFromRequest(
        authorizationHeader,
        cookieHeader,
      ),
      refreshToken: getRefreshTokenFromRequest(
        refreshTokenHeader,
        cookieHeader,
      ),
      method: 'PATCH',
      path: `/appointments/${appointmentId}`,
      body,
    });

    writeProxyResponse(
      response,
      result,
      getRememberMeFromCookie(cookieHeader) ?? false,
    );

    return result.body;
  }

  @ApiOperation({ summary: 'Proxy appointment cancellation to booking-api' })
  @Patch(':id/cancel')
  async cancelAppointment(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Headers('x-refresh-token') refreshTokenHeader: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Param('id') appointmentId: string,
    @Res({ passthrough: true }) response: AuthCookieResponse,
  ): Promise<unknown> {
    const result = await this.protectedProxyService.forward({
      authorizationHeader: getAuthorizationHeaderFromRequest(
        authorizationHeader,
        cookieHeader,
      ),
      refreshToken: getRefreshTokenFromRequest(
        refreshTokenHeader,
        cookieHeader,
      ),
      method: 'PATCH',
      path: `/appointments/${appointmentId}/cancel`,
    });

    writeProxyResponse(
      response,
      result,
      getRememberMeFromCookie(cookieHeader) ?? false,
    );

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
    @Res({ passthrough: true }) response: AuthCookieResponse,
  ): Promise<unknown> {
    const result = await this.protectedProxyService.forward({
      authorizationHeader: getAuthorizationHeaderFromRequest(
        authorizationHeader,
        cookieHeader,
      ),
      refreshToken: getRefreshTokenFromRequest(
        refreshTokenHeader,
        cookieHeader,
      ),
      method: 'GET',
      path: '/appointments/all',
    });

    writeProxyResponse(
      response,
      result,
      getRememberMeFromCookie(cookieHeader) ?? false,
    );

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
    @Res({ passthrough: true }) response: AuthCookieResponse,
  ): Promise<unknown> {
    const result = await this.protectedProxyService.forward({
      authorizationHeader: getAuthorizationHeaderFromRequest(
        authorizationHeader,
        cookieHeader,
      ),
      refreshToken: getRefreshTokenFromRequest(
        refreshTokenHeader,
        cookieHeader,
      ),
      method: 'GET',
      path: '/appointments/availability',
      query,
    });

    writeProxyResponse(
      response,
      result,
      getRememberMeFromCookie(cookieHeader) ?? false,
    );

    return result.body;
  }
}
