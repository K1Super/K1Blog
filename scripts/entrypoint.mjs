import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const required = [
  'APP_ENV',
  'SITE_URL',
  'DATABASE_PATH',
  'BETTER_AUTH_SECRET',
  'COMMENT_IP_PEPPER',
];

for (const key of required) {
  if (!process.env[key] || process.env[key].trim() === '') {
    console.error(`[entrypoint] missing required environment variable: ${key}`);
    process.exit(1);
  }
}

if (process.env.BETTER_AUTH_SECRET.length < 32) {
  console.error('[entrypoint] BETTER_AUTH_SECRET must be at least 32 characters');
  process.exit(1);
}

if (process.env.COMMENT_IP_PEPPER.length < 16) {
  console.error('[entrypoint] COMMENT_IP_PEPPER must be at least 16 characters');
  process.exit(1);
}

if (process.env.APP_ENV === 'production' && process.env.SITE_URL.startsWith('http://')) {
  console.warn('[entrypoint] production SITE_URL is not https; verify TLS termination');
}

const databasePath = path.isAbsolute(process.env.DATABASE_PATH)
  ? process.env.DATABASE_PATH
  : path.join(root, process.env.DATABASE_PATH);

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const { default: Database } = await import('better-sqlite3');
const { drizzle } = await import('drizzle-orm/better-sqlite3');
const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');

const sqlite = new Database(databasePath, { timeout: 5000 });
try {
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('foreign_keys = ON');
  migrate(drizzle(sqlite), { migrationsFolder: path.join(root, 'drizzle') });
  console.log('[entrypoint] database ready');
} catch (error) {
  console.error('[entrypoint] migration failed:', error instanceof Error ? error.message : error);
  sqlite.close();
  process.exit(1);
}
sqlite.close();

const override = process.argv.slice(2);
const isOverride = override.length > 0;
const command = isOverride ? override[0] : process.execPath;
const args = isOverride ? override.slice(1) : [path.join(root, 'server.js')];

const child = spawn(command, args, {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
});

let stopping = false;

function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`[entrypoint] received ${signal}, stopping`);
  child.kill('SIGTERM');
  const timer = setTimeout(() => {
    console.warn('[entrypoint] graceful shutdown timed out, killing server');
    child.kill('SIGKILL');
  }, 20_000);

  child.once('exit', (code) => {
    clearTimeout(timer);
    process.exit(code ?? 0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

child.on('error', (error) => {
  console.error('[entrypoint] failed to start server:', error.message);
  process.exit(1);
});

child.on('exit', (code) => {
  if (isOverride) {
    process.exit(code ?? 0);
  }
  if (!stopping) {
    console.error(`[entrypoint] server exited unexpectedly with code ${code ?? 1}`);
    process.exit(code ?? 1);
  }
});
