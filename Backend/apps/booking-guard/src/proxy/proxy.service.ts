import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GuardConfigService, sendRuntimeAlert } from '@coopers/common';
import { ProxyRequestOptions, ProxyResponse } from './proxy.types';

const DEFAULT_UPSTREAM_TIMEOUT_MS = 8_000;

function buildUrl(
  baseUrl: string,
  path: string,
  query?: ProxyRequestOptions['query'],
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${baseUrl}${normalizedPath}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, item));
        return;
      }

      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    });
  }

  return url.toString();
}

function getUpstreamBaseUrl(
  upstreams: ReturnType<GuardConfigService['getUpstreams']>,
  target: ProxyRequestOptions['target'],
): string {
  if (target === 'auth') {
    return upstreams.authApiUrl;
  }

  if (target === 'admin') {
    return upstreams.adminApiUrl;
  }

  return upstreams.bookingApiUrl;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();

  if (text.length === 0) {
    return null;
  }

  if (contentType.includes('application/json')) {
    return JSON.parse(text) as unknown;
  }

  return text;
}

function getUpstreamTimeoutMs(): number {
  const configuredValue = Number.parseInt(
    process.env.UPSTREAM_REQUEST_TIMEOUT_MS ?? '',
    10,
  );

  return Number.isFinite(configuredValue) && configuredValue > 0
    ? configuredValue
    : DEFAULT_UPSTREAM_TIMEOUT_MS;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(private readonly guardConfig: GuardConfigService) {}

  async forward(options: ProxyRequestOptions): Promise<ProxyResponse> {
    const upstreams = this.guardConfig.getUpstreams();
    const baseUrl = getUpstreamBaseUrl(upstreams, options.target);
    const url = buildUrl(baseUrl, options.path, options.query);

    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: options.method,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'x-internal-gateway-secret': this.guardConfig.internalGatewaySecret,
            ...options.headers,
          },
          body:
            options.body === undefined
              ? undefined
              : JSON.stringify(options.body),
        },
        options.timeoutMs ?? getUpstreamTimeoutMs(),
      );

      return {
        statusCode: response.status,
        body: await parseResponseBody(response),
      };
    } catch (error) {
      const detail = `${options.target} upstream request failed: ${options.method} ${url}`;

      this.logger.warn(detail, error instanceof Error ? error.stack : undefined);
      sendRuntimeAlert({
        category: 'upstream-request-failure',
        detail,
        error,
        method: options.method,
        path: options.path,
        severity: 'error',
        throttleSeconds: 900,
      });
      throw new ServiceUnavailableException(
        `${options.target} upstream is unavailable`,
      );
    }
  }

  async forwardStream(options: ProxyRequestOptions): Promise<Response> {
    const upstreams = this.guardConfig.getUpstreams();
    const baseUrl = getUpstreamBaseUrl(upstreams, options.target);
    const url = buildUrl(baseUrl, options.path, options.query);

    try {
      return await fetchWithTimeout(
        url,
        {
          method: options.method,
          headers: {
            accept: 'text/event-stream',
            'content-type': 'application/json',
            'x-internal-gateway-secret': this.guardConfig.internalGatewaySecret,
            ...options.headers,
          },
          body:
            options.body === undefined
              ? undefined
              : JSON.stringify(options.body),
        },
        options.timeoutMs ?? getUpstreamTimeoutMs(),
      );
    } catch (error) {
      const detail = `${options.target} upstream stream request failed: ${options.method} ${url}`;

      this.logger.warn(detail, error instanceof Error ? error.stack : undefined);
      sendRuntimeAlert({
        category: 'upstream-stream-request-failure',
        detail,
        error,
        method: options.method,
        path: options.path,
        severity: 'error',
        throttleSeconds: 900,
      });
      throw new ServiceUnavailableException(
        `${options.target} upstream is unavailable`,
      );
    }
  }
}
