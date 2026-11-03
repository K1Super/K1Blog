import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

import { postFrontmatterSchema, type Post, type PostMeta } from './schema';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'posts');
const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}-/;

function readingMinutes(source: string): { minutes: number; wordCount: number } {
  const plain = source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`[\](){}|-]/g, ' ');
  const cjk = (plain.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) ?? []).length;
  const words = (plain.replace(/[\u3400-\u4dbf\u4e00-\u9fff]/g, ' ').match(/[A-Za-z0-9]+/g) ?? [])
    .length;
  return {
    minutes: Math.max(1, Math.ceil(cjk / 350 + words / 200)),
    wordCount: cjk + words,
  };
}

function readPost(filePath: string): Post {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  const frontmatter = postFrontmatterSchema.safeParse(parsed.data);

  if (!frontmatter.success) {
    throw new Error(
      `内容 frontmatter 校验失败：${path.relative(process.cwd(), filePath)}\n${frontmatter.error.message}`,
    );
  }

  const filenameSlug = path.basename(filePath, '.mdx').replace(DATE_PREFIX, '');
  if (filenameSlug !== frontmatter.data.slug) {
    throw new Error(
      `文件名 slug "${filenameSlug}" 与 frontmatter slug "${frontmatter.data.slug}" 不一致：${filePath}`,
    );
  }

  const stats = readingMinutes(parsed.content);

  return {
    ...frontmatter.data,
    ...stats,
    readingMinutes: stats.minutes,
    filePath,
    content: parsed.content,
  };
}

function sortPosts(a: Post, b: Post): number {
  return b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug);
}

function readAllPosts(includeDrafts: boolean): Post[] {
  if (!fs.existsSync(CONTENT_DIR)) {
    return [];
  }

  const posts = fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => readPost(path.join(CONTENT_DIR, file)));

  const slugs = new Set<string>();
  for (const post of posts) {
    if (slugs.has(post.slug)) {
      throw new Error(`slug 重复：${post.slug}`);
    }
    slugs.add(post.slug);
  }

  return posts.filter((post) => includeDrafts || post.status === 'published').sort(sortPosts);
}

export function getAllPosts(includeDrafts = false): PostMeta[] {
  return readAllPosts(includeDrafts).map((post) => {
    const { content: _content, ...meta } = post;
    void _content;
    return meta;
  });
}

export function getPostBySlug(slug: string, includeDrafts = false): Post | null {
  return readAllPosts(includeDrafts).find((post) => post.slug === slug) ?? null;
}

export function getAllSlugs(): string[] {
  return getAllPosts().map((post) => post.slug);
}

export function getAllTags(): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const post of getAllPosts()) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-CN'));
}

export function getPostsByTag(label: string): PostMeta[] {
  return getAllPosts().filter((post) => post.tags.includes(label));
}

export function getArchive(): Array<{
  year: string;
  months: Array<{ month: string; posts: PostMeta[] }>;
}> {
  const years = new Map<string, Map<string, PostMeta[]>>();
  for (const post of getAllPosts()) {
    const [year, month] = post.publishedAt.split('-');
    if (!year || !month) continue;
    if (!years.has(year)) years.set(year, new Map());
    const months = years.get(year)!;
    if (!months.has(month)) months.set(month, []);
    months.get(month)!.push(post);
  }

  return [...years.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, months]) => ({
      year,
      months: [...months.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([month, posts]) => ({ month, posts })),
    }));
}

export function getRelatedPosts(slug: string, limit = 3): PostMeta[] {
  const current = getAllPosts().find((post) => post.slug === slug);
  if (!current) return [];
  return getAllPosts()
    .filter((post) => post.slug !== slug)
    .map((post) => ({
      post,
      shared: post.tags.filter((tag) => current.tags.includes(tag)).length,
    }))
    .filter((item) => item.shared > 0)
    .sort((a, b) => b.shared - a.shared || b.post.publishedAt.localeCompare(a.post.publishedAt))
    .slice(0, limit)
    .map((item) => item.post);
}
