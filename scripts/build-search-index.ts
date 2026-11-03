import fs from 'node:fs';
import path from 'node:path';

import { getAllPosts } from '../features/content/loader';

const docs = getAllPosts().map((post) => ({
  id: post.slug,
  title: post.title,
  description: post.description,
  tags: post.tags.join(' '),
  slug: post.slug,
  publishedAt: post.publishedAt,
  readingMinutes: post.readingMinutes,
}));

const target = path.join(process.cwd(), 'public', 'search-index.json');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(docs, null, 2)}\n`, 'utf8');
console.log(`search index ok: ${docs.length} documents`);
