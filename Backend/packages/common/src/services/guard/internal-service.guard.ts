import { createHash, timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { SKIP_INTERNAL_SERVICE_AUTH } from './skip-internal-service-auth.decorator';

export const INTERNAL_GATEWAY_SECRET_HEADER = 'x-internal-gateway-secret';

type RequestWithHeaders = {
  headers: Record<string, string | string[] | undefined>;
};

// Defence in depth: upstream APIs (auth-api, booking-api) only accept requests
// that carry the shared secret injected by the booking-guard. Even if an upstream
// becomes network-reachable, traffic that did not flow through the guard is
// rejected. The guard fails closed when the secret is not configured.
@Injectable()
export class InternalServiceGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isSkipped = this.reflector.getAllAndOverride<boolean>(
      SKIP_INTERNAL_SERVICE_AUTH,
      [context.getHandler(), context.getClass()],
    );

    if (isSkipped) {
      return true;
    }

    const expectedSecret = this.configService.getOrThrow<string>(
      'INTERNAL_GATEWAY_SECRET',
    );
    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const providedSecret = this.getHeaderValue(
      request.headers[INTERNAL_GATEWAY_SECRET_HEADER],
    );

    if (!providedSecret || !this.secretsMatch(providedSecret, expectedSecret)) {
      throw new UnauthorizedException('Untrusted request origin.');
    }

    return true;
  }

  private getHeaderValue(
    value: string | string[] | undefined,
  ): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  // Hash both sides to a fixed length so timingSafeEqual never leaks length and
  // the comparison stays constant-time.
  private secretsMatch(provided: string, expected: string): boolean {
    const providedDigest = createHash('sha256').update(provided).digest();
    const expectedDigest = createHash('sha256').update(expected).digest();

    return timingSafeEqual(providedDigest, expectedDigest);
  }
}
