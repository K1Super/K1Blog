import { env } from '@/lib/env';

function toOrigin(value: string): string | null {
  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

function isPrivateHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1' ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
}

/**
 * 站点可信来源：生产只信任 SITE_URL 与 TRUSTED_ORIGINS；
 * 开发额外信任本机回环与局域网地址，便于通过 127.0.0.1 或 Network URL 访问管理端。
 */
export function trustedOrigins(request?: Request): string[] {
  const origins = new Set<string>();
  const site = toOrigin(env.SITE_URL);
  if (site) origins.add(site);

  for (const item of (env.TRUSTED_ORIGINS ?? '').split(',')) {
    const origin = toOrigin(item);
    if (origin) origins.add(origin);
  }

  if (env.APP_ENV !== 'production') {
    if (site) {
      const { protocol, port } = new URL(site);
      for (const host of ['localhost', '127.0.0.1']) {
        origins.add(`${protocol}//${host}${port ? `:${port}` : ''}`);
      }
    }

    const requestOrigin = request?.headers.get('origin');
    const normalized = requestOrigin ? toOrigin(requestOrigin) : null;
    if (normalized) {
      const { protocol, hostname } = new URL(normalized);
      if ((protocol === 'http:' || protocol === 'https:') && isPrivateHost(hostname)) {
        origins.add(normalized);
      }
    }
  }

  return [...origins];
}

export function isTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const normalized = toOrigin(origin);
  return normalized !== null && trustedOrigins(request).includes(normalized);
}
