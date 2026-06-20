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

// TRUST_PROXY accepts a boolean ("true"/"false") or a hop count (e.g. "1" for a
// single load balancer in front of the service). Anything else leaves Express on
// its safe default of not trusting the header.
function parseTrustProxySetting(
  value: string | undefined,
): boolean | number | undefined {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  const hops = Number(normalized);

  return Number.isInteger(hops) && hops >= 0 ? hops : undefined;
}

// Behind a reverse proxy / load balancer the client's real IP arrives in
// X-Forwarded-For. Express only exposes it on req.ip / req.ips once "trust proxy"
// is configured, and IP-based rate limiting is worthless without it — every client
// collapses onto the proxy's single IP. This stays opt-in via TRUST_PROXY so local
// development (no proxy) cannot be tricked into trusting a spoofed header.
export function configureTrustProxy(app: INestApplication): void {
  const trustProxy = parseTrustProxySetting(process.env.TRUST_PROXY);

  if (trustProxy === undefined) {
    return;
  }

  const httpAdapterInstance = app.getHttpAdapter().getInstance() as {
    set?: (setting: string, value: unknown) => void;
  };

  httpAdapterInstance.set?.('trust proxy', trustProxy);
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
