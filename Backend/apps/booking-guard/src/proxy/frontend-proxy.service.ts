import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GuardConfigService } from '@coopers/common';

type FrontendProxyResult = {
  statusCode: number;
  headers: Headers;
  body: Buffer;
};

const DEFAULT_FRONTEND_PROXY_TIMEOUT_MS = 5_000;

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

function isAdminFrontendRequest(originalUrl: string): boolean {
  return (
    originalUrl === '/admin-console' ||
    originalUrl.startsWith('/admin-console/')
  );
}

function isStaticAssetRequest(originalUrl: string): boolean {
  const pathname = new URL(originalUrl, 'http://guard.local').pathname;

  return pathname.split('/').pop()?.includes('.') === true;
}

function isViteDevModuleRequest(originalUrl: string): boolean {
  const pathname = new URL(originalUrl, 'http://guard.local').pathname;

  return (
    pathname.startsWith('/@vite/') ||
    pathname.startsWith('/@react-refresh') ||
    pathname.startsWith('/@id/') ||
    pathname.startsWith('/src/') ||
    pathname.startsWith('/node_modules/')
  );
}

function normalizeFrontendPath(
  originalUrl: string,
  isAdminRequest: boolean,
): string {
  if (originalUrl === '/admin-console') {
    return '/admin-console/';
  }

  if (
    !isAdminRequest &&
    !isStaticAssetRequest(originalUrl) &&
    !isViteDevModuleRequest(originalUrl)
  ) {
    return '/';
  }

  return originalUrl;
}

function getFrontendProxyTimeoutMs(): number {
  const configuredValue = Number.parseInt(
    process.env.FRONTEND_PROXY_TIMEOUT_MS ?? '',
    10,
  );

  return Number.isFinite(configuredValue) && configuredValue > 0
    ? configuredValue
    : DEFAULT_FRONTEND_PROXY_TIMEOUT_MS;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    getFrontendProxyTimeoutMs(),
  );

  try {
    return await fetch(url, {
      method: 'GET',
      headers: {
        accept: '*/*',
        'x-coopers-guard-proxy': 'true',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

@Injectable()
export class FrontendProxyService {
  constructor(private readonly guardConfig: GuardConfigService) {}

  async forward(originalUrl: string): Promise<FrontendProxyResult> {
    const { adminFrontendUrl, frontendUrl } = this.guardConfig.getUpstreams();
    const isAdminRequest = isAdminFrontendRequest(originalUrl);
    const targetFrontendUrl = isAdminRequest
      ? adminFrontendUrl
      : frontendUrl;
    const targetPath = normalizeFrontendPath(originalUrl, isAdminRequest);

    try {
      const response = await fetchWithTimeout(
        buildFrontendUrl(targetFrontendUrl, targetPath),
      );
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
