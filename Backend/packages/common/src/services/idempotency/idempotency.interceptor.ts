import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import {
  Observable,
  catchError,
  from,
  map,
  mergeMap,
  of,
  throwError,
} from 'rxjs';
import {
  IdempotencyResponseBody,
  IdempotencyService,
} from './idempotency.service';

const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

type IdempotencyRequestUser = {
  userId: string;
};

type IdempotencyHttpRequest = {
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
  method: string;
  originalUrl?: string;
  route?: {
    path?: string;
  };
  url?: string;
  user?: IdempotencyRequestUser;
};

type IdempotencyHttpResponse = {
  status?: (statusCode: number) => unknown;
  statusCode?: number;
};

function getHeaderValue(
  headers: IdempotencyHttpRequest['headers'],
  name: string,
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getRequestPath(request: IdempotencyHttpRequest): string {
  return request.originalUrl ?? request.url ?? request.route?.path ?? '';
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  public constructor(private readonly idempotencyService: IdempotencyService) {}

  public intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<IdempotencyHttpRequest>();
    const response = httpContext.getResponse<IdempotencyHttpResponse>();
    const idempotencyKey = getHeaderValue(
      request.headers,
      IDEMPOTENCY_KEY_HEADER,
    );
    const userId = request.user?.userId;

    if (!userId) {
      return next.handle();
    }

    return from(
      this.idempotencyService.reserve({
        key: idempotencyKey ?? '',
        method: request.method,
        path: getRequestPath(request),
        requestBody: request.body,
        userId,
      }),
    ).pipe(
      mergeMap((reservation) => {
        if (reservation.kind === 'completed') {
          response.status?.(reservation.responseStatusCode);

          return of(reservation.responseBody);
        }

        if (reservation.kind === 'processing') {
          throw new ConflictException(
            'An identical request is already being processed.',
          );
        }

        return next.handle().pipe(
          mergeMap((responseBody) =>
            from(
              this.idempotencyService.complete({
                record: reservation.record,
                responseBody: responseBody as IdempotencyResponseBody,
                responseStatusCode: response.statusCode ?? 200,
              }),
            ).pipe(map(() => responseBody)),
          ),
          catchError((error: unknown) =>
            from(this.idempotencyService.markFailed(reservation.record)).pipe(
              mergeMap(() => throwError(() => error)),
            ),
          ),
        );
      }),
    );
  }
}
