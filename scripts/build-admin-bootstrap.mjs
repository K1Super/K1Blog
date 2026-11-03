import fs from 'node:fs';
import path from 'node:path';

import { build } from 'esbuild';

const root = process.cwd();
const outfile = path.join(root, 'dist', 'bootstrap-admin.mjs');

fs.mkdirSync(path.dirname(outfile), { recursive: true });

await build({
  entryPoints: [path.join(root, 'scripts', 'bootstrap-admin.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // 仅原生模块与 Next 已单独复制的 drizzle 保持外部，其余依赖必须进产物，
  // 否则运行镜像的 node_modules 缺少 zod/better-auth 时脚本无法启动
  external: ['better-sqlite3', 'drizzle-orm', 'drizzle-orm/*'],
  tsconfig: path.join(root, 'tsconfig.json'),
  logLevel: 'warning',
});

console.log('admin bootstrap bundled');
