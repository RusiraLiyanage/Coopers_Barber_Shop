import { INestApplication } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import helmet from 'helmet';
import { AllExceptionsFilter } from '../filters';
import { createGlobalValidationPipe } from '../pipes';

export type ApiSecurityOptions = {
  cors?: CorsOptions;
};

function parseFrontendOrigins(frontendUrl: string): string | string[] {
  const origins = frontendUrl
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length === 1 ? origins[0] : origins;
}

export function createFrontendCorsOptions(frontendUrl: string): CorsOptions {
  return {
    origin: parseFrontendOrigins(frontendUrl),
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
