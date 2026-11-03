import { describe, expect, it } from 'vitest';

import { hashIdempotencyKey, hashIp } from '@/lib/security/crypto';
import { createCsrfToken, verifyCsrfToken } from '@/lib/security/csrf';

describe('crypto', () => {
  it('hashes ips and idempotency keys deterministically', () => {
    expect(hashIp('1.2.3.4')).toHaveLength(64);
    expect(hashIp('1.2.3.4')).toBe(hashIp('1.2.3.4'));
    expect(hashIp('1.2.3.4')).not.toBe(hashIp('1.2.3.5'));
    expect(hashIdempotencyKey('key-123')).toHaveLength(64);
  });

  it('verifies CSRF tokens with the session token', () => {
    const token = createCsrfToken('session-token');
    expect(verifyCsrfToken('session-token', token)).toBe(true);
    expect(verifyCsrfToken('another-session', token)).toBe(false);
    expect(verifyCsrfToken('session-token', null)).toBe(false);
  });
});
