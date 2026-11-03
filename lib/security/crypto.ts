import { createHmac, timingSafeEqual } from 'node:crypto';

import { env } from '@/lib/env';

function hmac(value: string, domain: string): string {
  return createHmac('sha256', env.COMMENT_IP_PEPPER).update(`${domain}:${value}`).digest('hex');
}

export function hashIp(ip: string): string {
  return hmac(ip, 'ip');
}

export function hashIdempotencyKey(key: string): string {
  return hmac(key, 'idempotency');
}

export function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
