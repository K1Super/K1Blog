import type { Metadata } from 'next';

import { SearchClient } from '@/components/search/search-client';

export const metadata: Metadata = {
  title: '搜索',
  description: '搜索标题、摘要与标签。',
  alternates: { canonical: '/search' },
};

export default function SearchPage() {
  return (
    <section className="search-page">
      <header className="search-head">
        <p className="eyebrow">站内检索</p>
        <h1 className="search-title">搜索</h1>
      </header>
      <SearchClient />
    </section>
  );
}
