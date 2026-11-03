import 'server-only';

import { headers } from 'next/headers';

import { auth } from './auth-core';

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function getSessionFromHeaders(requestHeaders: Headers) {
  return auth.api.getSession({
    headers: requestHeaders,
  });
}
