import Link from 'next/link';

import type { PostMeta } from '@/features/content/schema';
import { formatDate, padIndex, postHref, readingLabel } from '@/lib/utils';

export function NoteRow({ post, index }: { post: PostMeta; index: number }) {
  const tags = post.tags.join(' / ');

  return (
    <li className="note-item">
      <Link className="note-link" href={postHref(post.slug)}>
        <span className="note-num">{padIndex(index)}</span>
        <span className="note-body">
          <span className="note-meta">
            <span>{formatDate(post.publishedAt)}</span>
            <span>{tags}</span>
            <span>{readingLabel(post.readingMinutes)}</span>
          </span>
          <h2 className="note-title">{post.title}</h2>
          <span className="note-desc">{post.description}</span>
        </span>
        <span className="note-arrow" aria-hidden="true">
          →
        </span>
      </Link>
    </li>
  );
}
