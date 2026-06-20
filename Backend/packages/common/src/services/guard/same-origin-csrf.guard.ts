import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// CSRF is only a risk for the unsafe (state-changing) verbs; safe verbs are
// exempt so browser navigations such as the OAuth callback GET are untouched.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Every env var that can legitimately hold a browser origin for this gateway.
// Each may be a comma-separated list. The allow-list is a superset of the CORS
// origins, so the guard never rejects a request CORS would have permitted.
const FRONTEND_ORIGIN_ENV_KEYS = [
  'FRONTEND_URL',
  'FRONTEND_DEV_URL',
  'ADMIN_FRONTEND_URL',
  'ADMIN_FRONTEND_DEV_URL',
];

type CsrfRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

// Defence in depth against CSRF. SameSite=Lax already stops the auth cookie from
// riding along on cross-site requests, but that protection disappears the moment
// cookies move to SameSite=None (e.g. a cross-domain deployment). CORS does not
// help here: it only blocks the browser from reading the response, the request
// still reaches the handler. So we verify the Origin (falling back to Referer)
// server-side for every state-changing request. Browsers always attach Origin on
// cross-origin — and same-origin non-GET — requests and JS cannot forge it, so a
// forged cross-site POST is rejected here. Requests with no Origin/Referer
// (non-browser clients) are left to SameSite.
@Injectable()
export class SameOriginCsrfGuard implements CanActivate {
  private cachedAllowedOrigins: Set<string> | null = null;

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<CsrfRequest>();
    const method = (request.method ?? 'GET').toUpperCase();

    if (SAFE_METHODS.has(method)) {
      return true;
    }

    const requestOrigin = this.getRequestOrigin(request);

    if (!requestOrigin) {
      // Nothing to verify (non-browser client); SameSite cookies still apply.
      return true;
    }

    // Same-origin requests are not CSRF by definition. The SPAs are served by
    // this gateway, so their API calls carry the gateway's own origin — trust any
    // request whose Origin host matches the host it was actually sent to.
    if (this.isSameOrigin(requestOrigin, request)) {
      return true;
    }

    // Otherwise it must be one of the explicitly configured cross-origin
    // frontends (e.g. a separately hosted SPA).
    if (!this.getAllowedOrigins().has(requestOrigin)) {
      throw new ForbiddenException('Request origin is not allowed.');
    }

    return true;
  }

  private isSameOrigin(requestOrigin: string, request: CsrfRequest): boolean {
    const targetHost = this.getTargetHost(request);

    if (!targetHost) {
      return false;
    }

    return this.getHostFromOrigin(requestOrigin) === targetHost;
  }

  // The host the browser actually addressed. Behind a proxy the public host is
  // carried in X-Forwarded-Host; fall back to the Host header otherwise.
  private getTargetHost(request: CsrfRequest): string | undefined {
    const forwardedHost = this.getHeaderValue(
      request.headers['x-forwarded-host'],
    );
    const host = forwardedHost ?? this.getHeaderValue(request.headers.host);

    return host ? host.split(',')[0]?.trim().toLowerCase() : undefined;
  }

  private getHostFromOrigin(origin: string): string | undefined {
    try {
      return new URL(origin).host.toLowerCase();
    } catch {
      return undefined;
    }
  }

  private getRequestOrigin(request: CsrfRequest): string | undefined {
    const origin = this.getHeaderValue(request.headers.origin);

    if (origin) {
      return this.normalizeOrigin(origin);
    }

    // Older browsers may omit Origin but still send Referer on the same request.
    const referer = this.getHeaderValue(request.headers.referer);

    return referer ? this.normalizeOrigin(referer) : undefined;
  }

  private getAllowedOrigins(): Set<string> {
    if (this.cachedAllowedOrigins) {
      return this.cachedAllowedOrigins;
    }

    const allowedOrigins = new Set<string>();

    for (const key of FRONTEND_ORIGIN_ENV_KEYS) {
      const configuredValue = this.config.get<string>(key);

      if (!configuredValue) {
        continue;
      }

      for (const part of configuredValue.split(',')) {
        const normalized = this.normalizeOrigin(part.trim());

        if (normalized) {
          allowedOrigins.add(normalized);
        }
      }
    }

    this.cachedAllowedOrigins = allowedOrigins;

    return allowedOrigins;
  }

  private normalizeOrigin(value: string): string | undefined {
    try {
      const url = new URL(value);

      return `${url.protocol}//${url.host}`.toLowerCase();
    } catch {
      return undefined;
    }
  }

  private getHeaderValue(
    value: string | string[] | undefined,
  ): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }
}
