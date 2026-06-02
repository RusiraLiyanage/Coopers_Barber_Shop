import { INestApplication } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import helmet from 'helmet';
import { AllExceptionsFilter } from '../filters';
import { createGlobalValidationPipe } from '../pipes';

export type ApiSecurityOptions = {
  cors?: CorsOptions;
};

export function createFrontendCorsOptions(frontendUrl: string): CorsOptions {
  return {
    origin: frontendUrl,
    credentials: true,
    exposedHeaders: ['x-access-token', 'x-refresh-token'],
  };
}

export function configureApiSecurity(
  app: INestApplication,
  options: ApiSecurityOptions = {},
): void {
  if (options.cors) {
    app.enableCors(options.cors);
  } else {
    app.enableCors();
  }

  app.use(helmet());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(createGlobalValidationPipe());
}
