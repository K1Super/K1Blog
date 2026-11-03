'use client';

import { useEffect, useState } from 'react';

type DockItem = {
  index: string;
  title: string;
};

export function WorkDock({ items }: { items: DockItem[] }) {
  const [active, setActive] = useState(() => (items[0] ? `exhibit-${items[0].index}` : null));

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(`exhibit-${item.index}`))
      .filter((section): section is HTMLElement => section !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-38% 0px -52% 0px', threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="work-dock" aria-label="作品索引">
      <span className="work-dock-label">INDEX</span>
      <ol className="work-dock-list">
        {items.map((item) => {
          const target = `exhibit-${item.index}`;
          const isActive = active === target;
          return (
            <li key={item.index}>
              <a
                className={isActive ? 'work-dock-link is-active' : 'work-dock-link'}
                href={`#${target}`}
                aria-current={isActive ? 'location' : undefined}
              >
                <span className="work-dock-num">{item.index}</span>
                <span className="work-dock-title">{item.title}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
