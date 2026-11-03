import Link from 'next/link';

import type { Heading } from '@/features/content/headings';

export function ArticleToc({ headings }: { headings: Heading[] }) {
  if (headings.length === 0) return null;

  return (
    <aside className="article-aside" aria-label="文章目录">
      <nav className="toc">
        <p className="toc-title">CONTENTS</p>
        <ol className="toc-list">
          {headings.map((heading, index) => (
            <li key={heading.id}>
              <Link href={`#${heading.id}`}>
                <span className="toc-code">{String(index + 1).padStart(2, '0')}</span>
                {heading.text}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  );
}
