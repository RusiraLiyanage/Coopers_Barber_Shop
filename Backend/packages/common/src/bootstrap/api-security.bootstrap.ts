import { INestApplication } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import helmet, { HelmetOptions } from 'helmet';
import { AllExceptionsFilter } from '../filters';
import { createGlobalValidationPipe } from '../pipes';

export type ApiSecurityOptions = {
  cors?: CorsOptions;
  helmet?: HelmetOptions;
};

// there might be a time multiple frontend urls are passed
function parseFrontendOrigins(frontendUrl: string): string | string[] {
  const origins = frontendUrl
    .split(',')
    .map((origin) => origin.trim()) // no spaces in the values
    .filter(Boolean); // this will remove the empty values from the array

  return origins.length === 1 ? origins[0] : origins;
}

// token headers are only readable by this frontend
export function createFrontendCorsOptions(frontendUrl: string): CorsOptions {
  return {
    origin: parseFrontendOrigins(frontendUrl),
    credentials: true,
    exposedHeaders: ['x-access-token', 'x-refresh-token'], // exposing the access token and refresh token to these frontends. (otherwise the browser cannot read them)
  };
}

export function configureApiSecurity(
  app: INestApplication,
  options: ApiSecurityOptions = {},
): void {
  // Only browser-facing services (the guard) need CORS. Internal upstreams are
  // reached server-to-server, so we leave CORS disabled when no options are given
  // rather than falling back to a permissive default.
  if (options.cors) {
    app.enableCors(options.cors);
  }

  app.use(helmet(options.helmet)); // adds browser security headers to HTTP responses.
  app.useGlobalFilters(new AllExceptionsFilter()); // all exception filter --> HTTP exceptions will have a message while others have internal error message
  app.useGlobalPipes(createGlobalValidationPipe()); // validation pipeline for DTO validation
}
