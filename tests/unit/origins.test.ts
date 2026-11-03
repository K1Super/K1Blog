import { describe, expect, it } from 'vitest';

process.env.APP_ENV = 'development';
process.env.SITE_URL = 'http://localhost:3000';
process.env.TRUSTED_ORIGINS = '';

const { isTrustedOrigin } = await import('@/lib/security/origins');

function requestFrom(origin: string): Request {
  return new Request('http://localhost:3000/', { headers: { origin } });
}

describe('trusted origins', () => {
  it('accepts the configured site origin', () => {
    expect(isTrustedOrigin(requestFrom('http://localhost:3000'))).toBe(true);
  });

  it('accepts loopback and private network origins in development', () => {
    expect(isTrustedOrigin(requestFrom('http://127.0.0.1:3000'))).toBe(true);
    expect(isTrustedOrigin(requestFrom('http://192.168.10.5:3000'))).toBe(true);
  });

  it('rejects foreign and malformed origins', () => {
    expect(isTrustedOrigin(requestFrom('https://evil.example'))).toBe(false);
    expect(isTrustedOrigin(requestFrom('not-an-origin'))).toBe(false);
  });
});
