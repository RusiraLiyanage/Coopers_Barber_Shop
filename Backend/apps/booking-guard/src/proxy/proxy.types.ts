export type ProxyTarget = 'auth' | 'booking' | 'admin';

export type ProxyMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ProxyRequestOptions = {
  target: ProxyTarget;
  method: ProxyMethod;
  path: string;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
};

export type ProxyResponse = {
  statusCode: number;
  body: unknown;
};
