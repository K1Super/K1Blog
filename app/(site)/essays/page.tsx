import type { Metadata } from 'next';

import { NoteRow } from '@/components/content/note-row';
import { getAllPosts } from '@/features/content';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = {
  title: '随笔',
  description: '按发布时间倒序的全部随笔。',
  alternates: { canonical: '/essays' },
};

export default function EssaysPage() {
  const posts = getAllPosts();
  const latest = posts[0];
  const count = String(posts.length).padStart(3, '0');
  const year = latest?.publishedAt.slice(0, 4) ?? '';

  return (
    <section className="notes-page">
      <header className="notes-head">
        <div>
          <p className="eyebrow">WRITING / NOTES</p>
          <h1 className="sr-only" id="notes-title">
            随笔
          </h1>
          <p className="notes-statement">写下判断，放一夜，再校准。</p>
        </div>
        <div className="notes-meta">
          <span>{count} NOTES</span>
          <span>LATEST / {latest ? formatDate(latest.publishedAt) : '—'}</span>
        </div>
      </header>

      <div className="notes-index">
        <span>ARCHIVE / {year}</span>
        <span>按发布时间倒序</span>
      </div>

      <ol className="note-list">
        {posts.map((post, index) => (
          <NoteRow key={post.slug} post={post} index={index} />
        ))}
      </ol>
    </section>
  );
}
