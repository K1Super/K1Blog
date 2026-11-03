import fs from 'node:fs';

import { e2eAdminEmail, e2eAdminPassword, e2eAdminUsername } from '../../tests/e2e/credentials';

process.env.APP_ENV = 'test';
process.env.SITE_URL = 'http://127.0.0.1:3100';
process.env.DATABASE_PATH = './data/test.db';
process.env.BETTER_AUTH_SECRET = 'k1-e2e-secret-value-that-is-long-enough';
process.env.COMMENT_IP_PEPPER = 'k1-e2e-comment-ip-pepper-value';

for (const suffix of ['', '-wal', '-shm']) {
  fs.rmSync(`data/test.db${suffix}`, { force: true });
}

const { db, rawDb } = await import('../../lib/db/client-core');
const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
migrate(db, { migrationsFolder: 'drizzle' });

const { auth } = await import('../../lib/auth/auth-core');
await auth.api.signUpEmail({
  body: {
    email: e2eAdminEmail,
    password: e2eAdminPassword,
    name: '测试管理员',
    username: e2eAdminUsername,
  },
  headers: new Headers({
    host: '127.0.0.1:3100',
    origin: 'http://127.0.0.1:3100',
  }),
});

console.log('e2e database ready');
rawDb.close();
