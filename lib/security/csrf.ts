import { createHmac } from 'node:crypto';

import { env } from '@/lib/env';
import { constantTimeEqual } from './crypto';

function sign(sessionToken: string): string {
  return createHmac('sha256', env.BETTER_AUTH_SECRET)
    .update(`csrf:${sessionToken}`)
    .digest('base64url');
}

export function createCsrfToken(sessionToken: string): string {
  return sign(sessionToken);
}

export function verifyCsrfToken(sessionToken: string, token: string | null): boolean {
  if (!token) return false;
  return constantTimeEqual(sign(sessionToken), token);
}
