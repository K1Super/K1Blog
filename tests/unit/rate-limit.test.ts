import { beforeEach, describe, expect, it } from 'vitest';

import { checkRateLimit, resetRateLimits } from '@/lib/rate-limit';

describe('rate limit', () => {
  beforeEach(() => resetRateLimits());

  it('allows up to the limit and rejects the next request', () => {
    for (let index = 0; index < 5; index += 1) {
      expect(checkRateLimit('ip', 5, 60_000).ok).toBe(true);
    }
    const rejected = checkRateLimit('ip', 5, 60_000);
    expect(rejected.ok).toBe(false);
    expect(rejected.retryAfterMs).toBeGreaterThan(0);
  });

  it('keeps buckets independent', () => {
    expect(checkRateLimit('a', 1, 60_000).ok).toBe(true);
    expect(checkRateLimit('a', 1, 60_000).ok).toBe(false);
    expect(checkRateLimit('b', 1, 60_000).ok).toBe(true);
  });
});
