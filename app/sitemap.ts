import type { MetadataRoute } from 'next';

import { getAllPosts, getAllTags } from '@/features/content';
import { projects } from '@/lib/projects';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.SITE_URL ?? 'http://localhost:3000';
  const posts = getAllPosts();
  const tags = getAllTags();

  return [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/essays`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    {
      url: `${base}/projects`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...projects.map((project) => ({
      url: `${base}/projects/${project.slug}`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    })),
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/search`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    ...posts.map((post) => ({
      url: `${base}/posts/${post.slug}`,
      lastModified: new Date(`${post.updatedAt ?? post.publishedAt}T00:00:00+08:00`),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...tags.map((tag) => ({
      url: `${base}/tags/${encodeURIComponent(tag.label)}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}
