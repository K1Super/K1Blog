import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const configuredPath = process.env.DATABASE_PATH ?? 'data/k1blog.db';

if (!path.isAbsolute(configuredPath)) {
  process.env.DATABASE_PATH = path.join(root, configuredPath);
}

process.env.NODE_ENV = 'production';

const serverPath = path.join(root, '.next', 'standalone', 'server.js');
await import(pathToFileURL(serverPath).href);
