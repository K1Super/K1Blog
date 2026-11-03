import Link from 'next/link';

import type { PostMeta } from '@/features/content/schema';
import { formatDate, padIndex, postHref, readingLabel } from '@/lib/utils';

export function PostRow({ post, index }: { post: PostMeta; index: number }) {
  return (
    <li>
      <Link className="entry" href={postHref(post.slug)}>
        <span className="entry-num">{padIndex(index)}</span>
        <span className="entry-body">
          <span className="entry-title">{post.title}</span>
          <span className="entry-tag">[ {post.tags[0] ?? '随笔'} ]</span>
        </span>
        <span className="entry-meta">
          <span>{formatDate(post.publishedAt)}</span>
          <span>{readingLabel(post.readingMinutes)}</span>
        </span>
        <span className="entry-arrow" aria-hidden="true">
          →
        </span>
      </Link>
    </li>
  );
}
