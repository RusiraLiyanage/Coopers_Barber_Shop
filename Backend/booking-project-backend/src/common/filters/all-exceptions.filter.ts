import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Default values
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong';

    // Handle known NestJS HTTP errors
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      message =
        typeof errorResponse === 'string'
          ? errorResponse
          : // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            (errorResponse as any).message || message;
    }

    // For debugging purposes.
    console.error('Exception caught:', exception);

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
