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

function shouldLogDetailedError(exception: unknown): boolean {
  if (!(exception instanceof HttpException)) {
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

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponseLike>();
    const request = context.getRequest<HttpRequestLike>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message: string | string[] = 'Something went wrong';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (isHttpExceptionResponse(exceptionResponse)) {
        message = normalizeMessage(exceptionResponse.message);
        error = normalizeError(exceptionResponse.error, exception.name);
      }
    }

    logException(exception, request, statusCode);

    // this is how the response looks like to the user. (when exception is there)
    response.status(statusCode).json({
      success: false,
      statusCode,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.originalUrl ?? request.url ?? '',
      method: request.method ?? '',
    });
  }
}
