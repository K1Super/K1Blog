import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
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

// 运行期依赖按锁文件重新装配成扁平生产树：Next 在非 Linux 构建机上追踪 pnpm 依赖时
// 会漏掉部分运行期包与跨平台原生二进制，直接沿用追踪结果会让 Linux 目标机启动失败
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'k1blog-runtime-'));
try {
  for (const file of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) {
    fs.copyFileSync(path.join(root, file), path.join(stage, file));
  }

  const installArgs = [
    'install',
    '--prod',
    '--frozen-lockfile',
    '--node-linker=hoisted',
    '--ignore-scripts',
    '--prefer-offline',
  ];
  // npm_execpath may be a JS launcher or the pnpm executable itself.
  // Running an .exe through node fails with ERR_UNKNOWN_FILE_EXTENSION.
  const launcher = process.env.npm_execpath;
  let install;
  if (launcher && /\.(c|m)?js$/i.test(launcher)) {
    install = childProcess.spawnSync(process.execPath, [launcher, ...installArgs], {
      cwd: stage,
      stdio: 'inherit',
    });
  } else if (launcher && launcher.toLowerCase().endsWith('.exe')) {
    install = childProcess.spawnSync(launcher, installArgs, {
      cwd: stage,
      stdio: 'inherit',
    });
  } else {
    install = childProcess.spawnSync(
      launcher ?? (process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'),
      installArgs,
      {
        cwd: stage,
        stdio: 'inherit',
        shell: true,
      },
    );
  }

  if (install.status !== 0) {
    throw new Error('runtime dependency staging failed');
  }

  copy(path.join(stage, 'node_modules'), path.join(standalone, 'node_modules'));
} finally {
  fs.rmSync(stage, { recursive: true, force: true });
}

// Turbopack 外置副本在独立目录里是相对软链接，替换 node_modules 后会悬空，
// 必须落成实体目录；better-sqlite3 的跨平台预编译二进制也随实体副本一并带上
const externalModules = path.join(standalone, '.next', 'node_modules');
if (fs.existsSync(externalModules)) {
  for (const entry of fs.readdirSync(externalModules)) {
    const target = path.join(externalModules, entry);
    if (!fs.lstatSync(target).isSymbolicLink()) continue;
    const base = entry.replace(/-[0-9a-f]{8,}$/, '');
    const source = path.join(standalone, 'node_modules', base);
    if (!fs.existsSync(source)) {
      throw new Error(`runtime package missing for external bundle: ${entry}`);
    }
    fs.rmSync(target, { force: true });
    copy(source, target);
  }
}

console.log('standalone assets prepared');
