import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GuardConfigService } from '@coopers/common';

type FrontendProxyResult = {
  statusCode: number;
  headers: Headers;
  body: Buffer;
};

const SKIPPED_RESPONSE_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'transfer-encoding',
]);

function buildFrontendUrl(baseUrl: string, originalUrl: string): string {
  const normalizedPath = originalUrl.startsWith('/')
    ? originalUrl
    : `/${originalUrl}`;

  return new URL(normalizedPath, baseUrl).toString();
}

@Injectable()
export class FrontendProxyService {
  constructor(private readonly guardConfig: GuardConfigService) {}

  async forward(originalUrl: string): Promise<FrontendProxyResult> {
    const { frontendUrl } = this.guardConfig.getUpstreams();

    try {
      const response = await fetch(buildFrontendUrl(frontendUrl, originalUrl), {
        method: 'GET',
        headers: {
          accept: '*/*',
          'x-coopers-guard-proxy': 'true',
        },
      });
      const body = Buffer.from(await response.arrayBuffer());

      return {
        statusCode: response.status,
        headers: response.headers,
        body,
      };
    } catch {
      throw new ServiceUnavailableException(
        'Frontend upstream is unavailable.',
      );
    }
  }

  shouldForwardHeader(headerName: string): boolean {
    return !SKIPPED_RESPONSE_HEADERS.has(headerName.toLowerCase());
  }
}
