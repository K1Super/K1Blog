'use client';

import { useSyncExternalStore } from 'react';

type Theme = 'night' | 'lamp';

const STORAGE_KEY = 'k1-theme';
const listeners = new Set<() => void>();

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): Theme {
  if (typeof document === 'undefined') return 'night';
  return document.documentElement.dataset.theme === 'lamp' ? 'lamp' : 'night';
}

function getServerSnapshot(): Theme {
  return 'night';
}

function apply(next: Theme) {
  document.documentElement.dataset.theme = next;
  window.localStorage.setItem(STORAGE_KEY, next);
  for (const listener of listeners) listener();
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = () => {
    const next: Theme = theme === 'lamp' ? 'night' : 'lamp';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const doc = document as ViewTransitionDocument;
    if (doc.startViewTransition && !reduce) {
      doc.startViewTransition(() => apply(next));
      return;
    }
    apply(next);
  };

  return (
    <button
      id="lamp"
      className="lamp"
      type="button"
      aria-pressed={theme === 'lamp'}
      aria-label={theme === 'lamp' ? '切换到深色模式' : '切换到浅色模式'}
      onClick={toggle}
    >
      {theme === 'lamp' ? (
        <svg
          className="lamp-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" />
        </svg>
      ) : (
        <svg
          className="lamp-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.5 1.5M17.1 17.1l1.5 1.5M18.6 5.4l-1.5 1.5M6.9 17.1l-1.5 1.5" />
        </svg>
      )}
    </button>
  );
}
