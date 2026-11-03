import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

const source = process.env.DATABASE_PATH ?? './data/k1blog.db';
const sourcePath = path.isAbsolute(source) ? source : path.join(process.cwd(), source);
const backupDir = path.join(process.cwd(), 'data', 'backups');
fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = path.join(backupDir, `k1blog-${stamp}.db`);

const db = new Database(sourcePath, { readonly: true });
await db.backup(target);
db.close();

const verify = new Database(target, { readonly: true });
const check = verify.prepare('PRAGMA integrity_check').get();
verify.close();

if (check?.integrity_check !== 'ok') {
  console.error('[backup] integrity check failed');
  process.exit(1);
}

console.log(`[backup] ok: ${path.relative(process.cwd(), target)}`);
