import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { sendRuntimeAlert } from '../alerts/runtime-alert';

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

function normalizeAlertText(value: unknown): string {
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

  return normalizeAlertText(message);
}

function sendSlackRuntimeErrorAlert(
  exception: unknown,
  request: HttpRequestLike,
  statusCode: number,
  error: string,
  message: string | string[],
): void {
  sendRuntimeAlert({
    category: 'http-exception',
    detail: getExceptionDetail(exception, message),
    error: exception,
    method: request.method,
    path: request.originalUrl ?? request.url,
    severity: statusCode >= HttpStatus.INTERNAL_SERVER_ERROR ? 'error' : 'warning',
    statusCode,
    statusText: error,
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
