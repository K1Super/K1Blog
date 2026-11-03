import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { username } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { env } from '@/lib/env';
import { db } from '@/lib/db/client-core';
import { schema } from '@/lib/db/schema';
import { trustedOrigins } from '@/lib/security/origins';
import { meetsPasswordPolicy, PASSWORD_POLICY_MESSAGE } from '@/lib/auth/password-policy';

const passwordPolicyPaths = [
  '/sign-up/email',
  '/change-password',
  '/reset-password',
  '/set-password',
];

export const auth = betterAuth({
  baseURL: env.SITE_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: (request) => trustedOrigins(request),
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
      displayUsername: false,
    }),
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (!passwordPolicyPaths.includes(ctx.path)) return;
      const password = ctx.path === '/sign-up/email' ? ctx.body?.password : ctx.body?.newPassword;
      if (typeof password === 'string' && !meetsPasswordPolicy(password)) {
        throw APIError.from('BAD_REQUEST', {
          message: PASSWORD_POLICY_MESSAGE,
          code: 'PASSWORD_POLICY_VIOLATION',
        });
      }
    }),
  },
  // E2E 并行用例共享同一 IP，测试环境关闭内置登录限流；生产仍由 Better Auth 与 Nginx 双重限制。
  rateLimit: {
    enabled: env.APP_ENV !== 'test',
  },
});
