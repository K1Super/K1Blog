'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type CSSProperties } from 'react';

import { site } from '@/lib/site';

function activeIndex(pathname: string): number | null {
  if (pathname === '/') return 0;
  if (pathname.startsWith('/essays') || pathname.startsWith('/tags/')) return 1;
  if (pathname.startsWith('/posts/')) return 1;
  if (pathname.startsWith('/projects')) return 2;
  if (pathname.startsWith('/about')) return 3;
  return null;
}

export function SiteNav() {
  const pathname = usePathname();
  const current = activeIndex(pathname);
  const [hover, setHover] = useState<number | null>(null);
  const target = hover ?? current;
  const visible = target !== null;

  return (
    <nav
      className="capsule-nav"
      aria-label="主导航"
      style={{ '--nav-index': target ?? 0 } as CSSProperties}
      onMouseLeave={() => setHover(null)}
    >
      <span className={`capsule-pill${visible ? '' : 'is-hidden'}`} aria-hidden="true" />
      {site.nav.map((item, index) => (
        <Link
          key={item.href}
          href={item.href}
          className={index === target ? 'capsule-link is-current' : 'capsule-link'}
          aria-current={index === current ? 'page' : undefined}
          onMouseEnter={() => setHover(index)}
          onFocus={() => setHover(index)}
          onBlur={() => setHover(null)}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
