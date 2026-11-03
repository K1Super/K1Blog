import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.APP_ENV = 'test';
process.env.SITE_URL = 'http://127.0.0.1:3000';
process.env.DATABASE_PATH = path.join(os.tmpdir(), `k1-test-${process.pid}.db`);
process.env.BETTER_AUTH_SECRET = 'test-only-secret-that-is-long-enough-for-tests';
process.env.COMMENT_IP_PEPPER = 'test-only-pepper-that-is-long-enough';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterAll } from 'vitest';

const sqlite = new Database(process.env.DATABASE_PATH);
migrate(drizzle(sqlite), { migrationsFolder: 'drizzle' });
sqlite.close();

afterAll(async () => {
  const { rawDb } = await import('../lib/db/client-core');
  rawDb.close();
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(`${process.env.DATABASE_PATH}${suffix}`, { force: true });
  }
});
