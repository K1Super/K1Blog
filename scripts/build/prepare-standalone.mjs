import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const standalone = path.join(root, '.next', 'standalone');

function copy(source, target) {
  if (!fs.existsSync(source)) return;
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true, force: true });
}

copy(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'));
copy(path.join(root, 'public'), path.join(standalone, 'public'));
copy(path.join(root, 'content'), path.join(standalone, 'content'));
copy(path.join(root, 'drizzle'), path.join(standalone, 'drizzle'));
copy(
  path.join(root, 'scripts', 'runtime', 'entrypoint.mjs'),
  path.join(standalone, 'scripts', 'runtime', 'entrypoint.mjs'),
);

copy(
  path.join(root, 'scripts', 'db', 'backup-db.mjs'),
  path.join(standalone, 'scripts', 'db', 'backup-db.mjs'),
);

copy(
  path.join(root, 'scripts', 'db', 'purge-comments.mjs'),
  path.join(standalone, 'scripts', 'db', 'purge-comments.mjs'),
);

copy(
  path.join(root, 'dist', 'bootstrap-admin.mjs'),
  path.join(standalone, 'scripts', 'db', 'bootstrap-admin.mjs'),
);

const pnpmDir = path.join(root, 'node_modules', '.pnpm');
if (fs.existsSync(pnpmDir)) {
  const drizzleEntry = fs.readdirSync(pnpmDir).find((entry) => entry.startsWith('drizzle-orm@'));
  if (drizzleEntry) {
    copy(
      path.join(pnpmDir, drizzleEntry, 'node_modules', 'drizzle-orm'),
      path.join(standalone, 'node_modules', 'drizzle-orm'),
    );
  }
}

console.log('standalone assets prepared');
