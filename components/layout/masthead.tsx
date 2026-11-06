import Link from 'next/link';

import { Clock } from './clock';
import { SiteNav } from './site-nav';
import { ThemeToggle } from './theme-toggle';

export function Masthead() {
  return (
    <header className="masthead">
      <Link className="brand" href="/">
        K1Blog
      </Link>
      <SiteNav />
      <div className="mast-right">
        <Clock />
        <ThemeToggle />
      </div>
    </header>
  );
}
