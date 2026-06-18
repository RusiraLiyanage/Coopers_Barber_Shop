import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GuardConfigService } from '@coopers/common';
import { ProxyRequestOptions, ProxyResponse } from './proxy.types';

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

@Injectable()
export class ProxyService {
  constructor(private readonly guardConfig: GuardConfigService) {}

  async forward(options: ProxyRequestOptions): Promise<ProxyResponse> {
    const upstreams = this.guardConfig.getUpstreams();
    const baseUrl = getUpstreamBaseUrl(upstreams, options.target);

    try {
      const response = await fetch(
        buildUrl(baseUrl, options.path, options.query),
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
      );

      return {
        statusCode: response.status,
        body: await parseResponseBody(response),
      };
    } catch {
      throw new ServiceUnavailableException(
        `${options.target} upstream is unavailable`,
      );
    }
  }

  async forwardStream(options: ProxyRequestOptions): Promise<Response> {
    const upstreams = this.guardConfig.getUpstreams();
    const baseUrl = getUpstreamBaseUrl(upstreams, options.target);

    try {
      return await fetch(buildUrl(baseUrl, options.path, options.query), {
        method: options.method,
        headers: {
          accept: 'text/event-stream',
          'content-type': 'application/json',
          'x-internal-gateway-secret': this.guardConfig.internalGatewaySecret,
          ...options.headers,
        },
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch {
      throw new ServiceUnavailableException(
        `${options.target} upstream is unavailable`,
      );
    }
  }
}
