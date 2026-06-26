import { joinServiceUrl, normalizeServiceUrl } from './service-url.util';

describe('service-url utilities', () => {
  it('removes trailing slashes from service urls', () => {
    expect(normalizeServiceUrl('http://localhost:7313///')).toBe(
      'http://localhost:7313',
    );
  });

  it('joins service urls and paths with exactly one slash', () => {
    expect(joinServiceUrl('http://localhost:7313/', '/admin/realtime')).toBe(
      'http://localhost:7313/admin/realtime',
    );
    expect(joinServiceUrl('http://localhost:7313', 'admin/realtime')).toBe(
      'http://localhost:7313/admin/realtime',
    );
  });
});
