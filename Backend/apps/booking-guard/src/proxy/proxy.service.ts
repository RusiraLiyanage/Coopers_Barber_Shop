import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GuardConfigService } from '@coopers/common';
import { ProxyRequestOptions, ProxyResponse } from './proxy.types';

function buildUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

@Injectable()
export class ProxyService {
  constructor(private readonly guardConfig: GuardConfigService) {}

  async forward(options: ProxyRequestOptions): Promise<ProxyResponse> {
    const upstreams = this.guardConfig.getUpstreams();
    const baseUrl =
      options.target === 'auth'
        ? upstreams.authApiUrl
        : upstreams.bookingApiUrl;

    try {
      const response = await fetch(buildUrl(baseUrl, options.path), {
        method: options.method,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
      });

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
}
