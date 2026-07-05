import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

export type ApiErrorResponse = {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[];
  code?: string;
  canExtend?: boolean;
  timestamp: string;
  path: string;
  method: string;
};

type HttpRequestLike = {
  method?: string;
  originalUrl?: string;
  url?: string;
};

type HttpResponseLike = {
  status: (statusCode: number) => {
    json: (body: ApiErrorResponse) => void;
  };
};

type HttpExceptionResponse = {
  code?: unknown;
  canExtend?: unknown;
  error?: unknown;
  message?: unknown;
};

const DEFAULT_SLACK_ALERT_MIN_STATUS = 400;
const DEFAULT_SLACK_ALERT_THROTTLE_SECONDS = 300;
const slackAlertLastSentAt = new Map<string, number>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isHttpExceptionResponse(
  value: unknown,
): value is HttpExceptionResponse {
  return isRecord(value);
}

function normalizeMessage(value: unknown): string | string[] {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value;
  }

  return 'Something went wrong';
}

function normalizeError(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeCode(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function normalizeCanExtend(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function shouldLogDetailedError(exception: unknown): boolean {
  if (!(exception instanceof HttpException)) {
    return true;
  }

  if (exception.getStatus() >= HttpStatus.BAD_REQUEST) {
    return true;
  }

  return (
    process.env.ENV === 'develop' || process.env.NODE_ENV === 'development'
  );
}

function logException(
  exception: unknown,
  request: HttpRequestLike,
  statusCode: number,
): void {
  if (!shouldLogDetailedError(exception)) {
    return;
  }

  // logging will only be happen for non http exceptions
  console.error('API exception caught:', {
    statusCode,
    method: request.method ?? '',
    path: request.originalUrl ?? request.url ?? '',
    exception,
  });
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeSlackText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'string') {
    return value;
  }

  return 'Something went wrong';
}

function getExceptionDetail(exception: unknown, message: string | string[]): string {
  if (exception instanceof Error && exception.message) {
    return exception.message;
  }

  return normalizeSlackText(message);
}

function getRuntimeServiceName(): string {
  return (
    process.env.SLACK_RUNTIME_ERROR_SERVICE_NAME ||
    process.env.SERVICE_CONFIG_NAME ||
    process.env.APP_CONFIG_APPLICATION ||
    process.env.npm_package_name ||
    'unknown-service'
  );
}

function shouldSendSlackAlert(
  statusCode: number,
  request: HttpRequestLike,
  detail: string,
): boolean {
  const webhookUrl = process.env.SLACK_RUNTIME_ERROR_WEBHOOK_URL;

  if (!webhookUrl) {
    return false;
  }

  const minStatus = parsePositiveInteger(
    process.env.SLACK_RUNTIME_ERROR_MIN_STATUS,
    DEFAULT_SLACK_ALERT_MIN_STATUS,
  );

  if (statusCode < minStatus) {
    return false;
  }

  const throttleSeconds = parsePositiveInteger(
    process.env.SLACK_RUNTIME_ERROR_THROTTLE_SECONDS,
    DEFAULT_SLACK_ALERT_THROTTLE_SECONDS,
  );
  const alertKey = [
    getRuntimeServiceName(),
    statusCode,
    request.method ?? '',
    request.originalUrl ?? request.url ?? '',
    detail,
  ].join('|');
  const now = Date.now();
  const lastSentAt = slackAlertLastSentAt.get(alertKey) ?? 0;

  if (now - lastSentAt < throttleSeconds * 1000) {
    return false;
  }

  slackAlertLastSentAt.set(alertKey, now);
  return true;
}

function truncateSlackValue(value: string, maxLength = 600): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function sendSlackRuntimeErrorAlert(
  exception: unknown,
  request: HttpRequestLike,
  statusCode: number,
  error: string,
  message: string | string[],
): void {
  const webhookUrl = process.env.SLACK_RUNTIME_ERROR_WEBHOOK_URL;
  const detail = getExceptionDetail(exception, message);

  if (!webhookUrl || !shouldSendSlackAlert(statusCode, request, detail)) {
    return;
  }

  const method = request.method ?? '';
  const path = request.originalUrl ?? request.url ?? '';
  const environment = process.env.ENV || process.env.NODE_ENV || 'unknown';
  const payload = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ':rotating_light: *Runtime Server Error* :rotating_light:',
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Service:*\n${getRuntimeServiceName()}`,
          },
          {
            type: 'mrkdwn',
            text: `*Environment:*\n${environment}`,
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${statusCode} ${error}`,
          },
          {
            type: 'mrkdwn',
            text: `*Route:*\n${method} ${path}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Problem:*\n\`${truncateSlackValue(detail).replace(/`/g, "'")}\``,
        },
      },
    ],
  };

  void fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((alertError: unknown) => {
    const alertMessage =
      alertError instanceof Error ? alertError.message : String(alertError);

    console.error('Slack runtime error alert failed:', alertMessage);
  });
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponseLike>();
    const request = context.getRequest<HttpRequestLike>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message: string | string[] = 'Something went wrong';
    let code: string | undefined;
    let canExtend: boolean | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (isHttpExceptionResponse(exceptionResponse)) {
        message = normalizeMessage(exceptionResponse.message);
        error = normalizeError(exceptionResponse.error, exception.name);
        code = normalizeCode(exceptionResponse.code);
        canExtend = normalizeCanExtend(exceptionResponse.canExtend);
      }
    }

    logException(exception, request, statusCode);
    sendSlackRuntimeErrorAlert(exception, request, statusCode, error, message);

    // this is how the response looks like to the user. (when exception is there)
    response.status(statusCode).json({
      success: false,
      statusCode,
      error,
      message,
      ...(code ? { code } : {}),
      ...(canExtend !== undefined ? { canExtend } : {}),
      timestamp: new Date().toISOString(),
      path: request.originalUrl ?? request.url ?? '',
      method: request.method ?? '',
    });
  }
}
