export function normalizeServiceUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export function joinServiceUrl(baseUrl: string, path: string): string {
  const normalizedBaseUrl = normalizeServiceUrl(baseUrl);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}
