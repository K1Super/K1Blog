import 'server-only';

import { redirect } from 'next/navigation';

import { getSession, getSessionFromHeaders } from '@/lib/auth/server';
import { AppError } from '@/lib/errors/app-error';
import { createCsrfToken, verifyCsrfToken } from '@/lib/security/csrf';

export async function requireAdminPage() {
  const session = await getSession();
  if (!session) redirect('/admin/login');
  return {
    session,
    csrfToken: createCsrfToken(session.session.token),
  };
}

export async function requireAdminApi(request: Request, requireCsrf = true) {
  const session = await getSessionFromHeaders(request.headers);
  if (!session) throw new AppError('K1-AUTH-001');

  if (requireCsrf) {
    const token = request.headers.get('x-csrf-token');
    if (!verifyCsrfToken(session.session.token, token)) {
      throw new AppError('K1-AUTH-003');
    }
  }

  return session;
}
