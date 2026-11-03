'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { create, insertMultiple, search } from '@orama/orama';
import { createTokenizer } from '@orama/tokenizers/mandarin';

import { formatDate, postHref, readingLabel } from '@/lib/utils';

type SearchDoc = {
  id: string;
  title: string;
  description: string;
  tags: string;
  slug: string;
  publishedAt: string;
  readingMinutes: number;
};

type SearchResult = { hits: Array<{ document: SearchDoc }> };

const runSearch = search as unknown as (
  db: ReturnType<typeof create>,
  params: { term: string; properties: string[]; limit: number },
) => Promise<SearchResult> | SearchResult;

const schema = {
  title: 'string',
  description: 'string',
  tags: 'string',
  slug: 'string',
  publishedAt: 'string',
  readingMinutes: 'number',
} as const;

export function SearchClient() {
  const database = useRef<ReturnType<typeof create> | null>(null);
  const [docs, setDocs] = useState<SearchDoc[]>([]);
  const [results, setResults] = useState<SearchDoc[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;

    fetch('/search-index.json')
      .then((response) => {
        if (!response.ok) throw new Error('search index unavailable');
        return response.json() as Promise<SearchDoc[]>;
      })
      .then((data) => {
        if (cancelled) return;
        const db = create({
          schema,
          components: { tokenizer: createTokenizer() },
        });
        insertMultiple(
          db,
          data.map((doc) => ({ ...doc, id: doc.slug })),
        );
        database.current = db;
        setDocs(data);
        setResults(data);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const term = query.trim();
    const db = database.current;
    if (!db) return;
    if (!term) return;

    let cancelled = false;

    const run = async () => {
      try {
        const result = await runSearch(db, {
          term,
          properties: ['title', 'description', 'tags'],
          limit: 20,
        });
        if (cancelled) return;
        setResults(result.hits.map((hit) => hit.document));
      } catch {
        if (!cancelled) setResults([]);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [query, docs]);

  const visible = query.trim() ? results : docs;

  return (
    <>
      <form className="search-form" onSubmit={(event) => event.preventDefault()}>
        <div className="field search-field">
          <label htmlFor="search-input">关键词 / SEARCH</label>
          <input
            id="search-input"
            className="search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button className="submit-button" type="submit">
          搜索
        </button>
      </form>

      <p className="muted" style={{ marginTop: '24px' }} aria-live="polite">
        {status === 'loading'
          ? '正在加载'
          : status === 'error'
            ? '搜索暂不可用'
            : `${String(visible.length).padStart(3, '0')} 条结果`}
      </p>

      {status === 'ready' && visible.length === 0 ? (
        <p className="muted" style={{ marginTop: '32px' }}>
          没有匹配的文章
        </p>
      ) : null}

      <ol className="search-results">
        {visible.map((post, index) => (
          <li key={post.slug} className="search-result">
            <span className="entry-num">{String(index + 1).padStart(3, '0')}</span>
            <Link href={postHref(post.slug)}>{post.title}</Link>
            <span className="search-date">
              {formatDate(post.publishedAt)} / {readingLabel(post.readingMinutes)}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}
