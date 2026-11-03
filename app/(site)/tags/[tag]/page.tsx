import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PostRow } from '@/components/content/post-row';
import { getAllTags, getPostsByTag } from '@/features/content';

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllTags().map((tag) => ({ tag: tag.label }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const label = decodeURIComponent(tag);
  return {
    title: `标签：${label}`,
    description: `标记为「${label}」的全部随笔。`,
    alternates: { canonical: `/tags/${encodeURIComponent(label)}` },
  };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  let label: string;
  try {
    label = decodeURIComponent(tag);
  } catch {
    notFound();
  }

  const posts = getPostsByTag(label);
  if (posts.length === 0) notFound();

  return (
    <section className="listing">
      <header className="listing-head">
        <div>
          <p className="eyebrow">TOPIC / TAG</p>
          <h1 className="listing-title"># {label}</h1>
        </div>
        <div className="listing-count">
          {String(posts.length).padStart(3, '0')} NOTES
          <br />
          按时间倒序
        </div>
      </header>

      <ol className="entries">
        {posts.map((post, index) => (
          <PostRow key={post.slug} post={post} index={index} />
        ))}
      </ol>

      <div className="listing-foot">
        <span>该标签下的全部随笔</span>
        <div className="listing-actions">
          <Link className="all-link" href="/essays">
            随笔
          </Link>
          <Link className="all-link" href="/search">
            搜索
          </Link>
        </div>
      </div>
    </section>
  );
}
