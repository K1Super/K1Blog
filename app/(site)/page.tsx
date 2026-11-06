import type { CSSProperties } from 'react';
import Link from 'next/link';

import { MagneticField } from '@/components/home/magnetic-field';
import { Specimen } from '@/components/work/specimen';
import { getAllPosts } from '@/features/content';
import { projects } from '@/lib/projects';
import { site } from '@/lib/site';
import { formatDate } from '@/lib/utils';

function delay(ms: number): CSSProperties {
  return { '--delay': `${ms}ms` } as CSSProperties;
}

export default function HomePage() {
  const posts = getAllPosts();
  const oldest = posts[posts.length - 1];
  const firstPlate = projects[0];

  return (
    <div className="home-stage">
      <MagneticField />

      <section className="cover" aria-labelledby="home-title">
        <div className="cover-inner">
          <div className="cover-foot">
            <h1 className="cover-title reveal" id="home-title" style={delay(80)}>
              <span className="cover-title-line">把判断写下来</span>
              <span className="cover-title-line cover-title-second">再反复校准</span>
            </h1>
            <p className="cover-kicker reveal" style={delay(160)}>
              {site.kicker}
            </p>
          </div>
        </div>
      </section>

      <section className="wall" aria-labelledby="home-wall-title">
        <h2 className="sr-only" id="home-wall-title">
          作品
        </h2>

        <div className="wall-scale">
          <span className="wall-scale-index">THE WALL</span>
          <span>{firstPlate.year}</span>
        </div>

        <div className="wall-grid">
          {projects.map((project) => (
            <Link key={project.slug} className="plate" href={`/projects/${project.slug}`}>
              <span className="plate-head">
                <span className="plate-num">{project.index}</span>
                <span className="plate-latin">{project.latin}</span>
              </span>

              <div className="plate-frame">
                <Specimen kind={project.specimen} />
              </div>

              <h3 className="plate-title">{project.title}</h3>
              <p className="plate-creed">{project.statement}</p>
              <p className="plate-spec">
                {project.category} · {project.stack.join(' / ')}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="colophon" aria-label="站点铭牌">
        <p className="colophon-line">留下的判断，都要经得起回看</p>

        <dl className="colophon-meter">
          <div>
            <dt>写作</dt>
            <dd>{String(posts.length).padStart(2, '0')}</dd>
          </div>
          <div>
            <dt>作品</dt>
            <dd>{String(projects.length).padStart(2, '0')}</dd>
          </div>
          <div>
            <dt>起算</dt>
            <dd>{oldest ? formatDate(oldest.publishedAt).slice(0, 7) : '—'}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
