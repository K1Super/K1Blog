import { Clock } from './clock';
import { SiteNav } from './site-nav';
import { ThemeToggle } from './theme-toggle';

export function Masthead() {
  return (
    <header className="masthead">
      <SiteNav />
      <div className="mast-right">
        <Clock />
        <ThemeToggle />
      </div>
    </header>
  );
}
