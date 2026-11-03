import type { CSSProperties } from 'react';

import { site } from '@/lib/site';

import { Field } from './field';
import { PresenceRegister } from './presence-register';
import { ResultShelf } from './result-shelf';

function delay(ms: number): CSSProperties {
  return { '--delay': `${ms}ms` } as CSSProperties;
}

export function Hero() {
  const year = String(new Date().getFullYear());

  return (
    <section className="hero" aria-labelledby="hero-title">
      <Field />
      <div className="hero-main">
        <h1 className="sr-only" id="hero-title">
          {site.name}
        </h1>
        <p className="eyebrow reveal" style={delay(80)}>
          WRITING / {year}
        </p>
        <p className="kicker reveal" style={delay(200)}>
          {site.kicker}
        </p>
        <p className="lede reveal" style={delay(240)}>
          {site.lede}
        </p>
      </div>
      <ResultShelf />
      <PresenceRegister />
    </section>
  );
}
