import { Body, Controller, Headers, Post, Res } from '@nestjs/common';
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

type StartConsultationRequestBody = {
  serviceId: string;
};

type ConsultationAnswerRequestBody = {
  questionId: string;
  answer: string;
};

type SubmitConsultationRequestBody = {
  serviceId: string;
  answers: ConsultationAnswerRequestBody[];
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

@ApiTags('guard-consultation-proxy')
@ApiBearerAuth('access-token')
@Controller('consultation')
export class ConsultationProxyController {
  constructor(private readonly protectedProxyService: ProtectedProxyService) {}

  @ApiOperation({ summary: 'Proxy consultation start to booking-api' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['serviceId'],
      properties: {
        serviceId: { type: 'string' },
      },
    },
  })
  @Post('start')
  async startConsultation(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Headers('x-refresh-token') refreshTokenHeader: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Body() body: StartConsultationRequestBody,
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
      path: '/consultation/start',
      body,
    });

    writeProxyResponse(
      response,
      result,
      getRememberMeFromCookie(cookieHeader) ?? false,
    );

    return result.body;
  }

  @ApiOperation({
    summary: 'Proxy consultation answer submission to booking-api',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['serviceId', 'answers'],
      properties: {
        serviceId: { type: 'string' },
        answers: {
          type: 'array',
          items: {
            type: 'object',
            required: ['questionId', 'answer'],
            properties: {
              questionId: { type: 'string' },
              answer: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @Post('submit')
  async submitConsultation(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Headers('x-refresh-token') refreshTokenHeader: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Body() body: SubmitConsultationRequestBody,
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
      path: '/consultation/submit',
      body,
    });

    writeProxyResponse(
      response,
      result,
      getRememberMeFromCookie(cookieHeader) ?? false,
    );

    return result.body;
  }
}
