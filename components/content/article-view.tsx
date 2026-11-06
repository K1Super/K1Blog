import Link from 'next/link';

import type { Post, PostMeta } from '@/features/content/schema';
import type { Heading } from '@/features/content/headings';
import { MdxContent } from '@/features/content';
import { ArticleToc } from '@/components/content/article-toc';
import { PostRow } from '@/components/content/post-row';
import { formatDate, formatDateFull, padIndex, readingLabel, tagHref } from '@/lib/utils';

export function ArticleView({
  post,
  number,
  headings,
  related,
}: {
  post: Post;
  number: number;
  headings: Heading[];
  related: PostMeta[];
}) {
  const year = post.publishedAt.slice(0, 4);

  return (
    <article className="article">
      <header className="article-head">
        <p className="eyebrow">随笔 · {year}</p>
        <span className="article-num">{padIndex(number)}</span>
        <h1 className="article-title">{post.title}</h1>
        <p className="article-description">{post.description}</p>
        <div className="article-meta">
          <span>发布于 {formatDateFull(post.publishedAt)}</span>
          {post.updatedAt ? <span>更新于 {formatDateFull(post.updatedAt)}</span> : null}
          <span>阅读 {readingLabel(post.readingMinutes)}</span>
        </div>
      </header>

      <div className="article-layout">
        <div className="article-body prose">
          <MdxContent source={post.content} />
        </div>
        <ArticleToc headings={headings} />
      </div>

      <footer className="article-foot">
        <ul className="article-tags">
          {post.tags.map((tag) => (
            <li key={tag}>
              <Link href={tagHref(tag)}>[ {tag} ]</Link>
            </li>
          ))}
        </ul>
      </footer>

      {related.length > 0 ? (
        <section className="related" aria-label="相关文章">
          <p className="related-title">相关文章</p>
          <ol className="entries">
            {related.map((item, index) => (
              <PostRow key={item.slug} post={item} index={index} />
            ))}
          </ol>
        </section>
      ) : null}

      <p className="muted" style={{ marginTop: '48px' }}>
        最近更新 {formatDate(post.updatedAt ?? post.publishedAt)}
      </p>
    </article>
  );
}
