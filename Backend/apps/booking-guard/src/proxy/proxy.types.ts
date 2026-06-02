export type ProxyTarget = 'auth' | 'booking';

export type ProxyMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ProxyRequestOptions = {
  target: ProxyTarget;
  method: ProxyMethod;
  path: string;
  body?: unknown;
};

export type ProxyResponse = {
  statusCode: number;
  body: unknown;
};
