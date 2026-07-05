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

const CONSULTATION_UPSTREAM_TIMEOUT_MS = 30_000;

type StartConsultationRequestBody = {
  serviceId: string;
};

type ConsultationAnswerRequestBody = {
  questionId: string;
  answer: string;
};

type HairPhotoRequestBody = {
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  data: string;
};

type SubmitConsultationRequestBody = {
  serviceId: string;
  answers: ConsultationAnswerRequestBody[];
  hairPhoto?: HairPhotoRequestBody;
};

const HAIR_PHOTO_SCHEMA = {
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
};

type EventStreamResponse = AuthCookieResponse & {
  status: (statusCode: number) => void;
  setHeader: (name: string, value: string) => void;
  write: (chunk: Uint8Array | string) => void;
  end: () => void;
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

async function pipeUpstreamEventStream(
  response: EventStreamResponse,
  upstreamResponse: globalThis.Response,
): Promise<void> {
  response.status(upstreamResponse.status);
  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('Connection', 'keep-alive');

  if (!upstreamResponse.body) {
    response.end();
    return;
  }

  const reader = upstreamResponse.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      response.write(Buffer.from(value));
    }
  } finally {
    response.end();
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
      timeoutMs: CONSULTATION_UPSTREAM_TIMEOUT_MS,
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
        hairPhoto: HAIR_PHOTO_SCHEMA,
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
      timeoutMs: CONSULTATION_UPSTREAM_TIMEOUT_MS,
    });

    writeProxyResponse(
      response,
      result,
      getRememberMeFromCookie(cookieHeader) ?? false,
    );

    return result.body;
  }

  @ApiOperation({
    summary: 'Stream consultation answer submission to booking-api',
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
        hairPhoto: HAIR_PHOTO_SCHEMA,
      },
    },
  })
  @Post('submit/stream')
  async submitConsultationStream(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Headers('x-refresh-token') refreshTokenHeader: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Body() body: SubmitConsultationRequestBody,
    @Res() response: EventStreamResponse,
  ): Promise<void> {
    const result = await this.protectedProxyService.forwardStream({
      authorizationHeader: getAuthorizationHeaderFromRequest(
        authorizationHeader,
        cookieHeader,
      ),
      refreshToken: getRefreshTokenFromRequest(
        refreshTokenHeader,
        cookieHeader,
      ),
      method: 'POST',
      path: '/consultation/submit/stream',
      body,
      timeoutMs: CONSULTATION_UPSTREAM_TIMEOUT_MS,
    });

    if (result.refreshedTokens) {
      setAuthCookies(response, result.refreshedTokens, {
        rememberMe: getRememberMeFromCookie(cookieHeader) ?? false,
      });
    }

    await pipeUpstreamEventStream(response, result.upstreamResponse);
  }
}
