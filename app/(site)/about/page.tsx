import type { Metadata } from 'next';

import { AboutView } from '@/components/about/about-view';
import { getAllPosts } from '@/features/content';
import { projects } from '@/lib/projects';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = {
  title: '关于',
  description: '关于这个站点、写作方法、作品与边界。',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  const posts = getAllPosts();
  const notesCount = String(posts.length).padStart(3, '0');
  const worksCount = String(projects.length).padStart(2, '0');
  const updated = posts[0] ? formatDate(posts[0].publishedAt) : '—';

  return <AboutView notesCount={notesCount} worksCount={worksCount} updated={updated} />;
}
