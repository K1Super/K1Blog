import { randomUUID } from 'node:crypto';

export function getRequestId(request: Request): string {
  return request.headers.get('x-request-id') ?? randomUUID();
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export function truncateUserAgent(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 120);
}
