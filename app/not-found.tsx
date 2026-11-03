import { Masthead } from '@/components/layout/masthead';
import { Rail } from '@/components/layout/rail';
import { SiteFooter } from '@/components/layout/site-footer';
import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <Rail />
      <Masthead />
      <main id="main">
        <section className="not-found-page">
          <p className="not-found-code">PAGE / NOT FOUND</p>
          <h1 className="not-found-title">页面不存在</h1>
          <p className="not-found-text">
            这个地址没有对应内容。它可能已被移动、改名，或者从未存在。
          </p>
          <Link className="not-found-link" href="/">
            返回首页 <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
