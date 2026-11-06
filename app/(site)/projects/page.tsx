import type { Metadata } from 'next';

import { ExhibitEntry } from '@/components/work/exhibit-entry';
import { projects } from '@/lib/projects';

export const metadata: Metadata = {
  title: '作品',
  description: 'Verthys、Terra Scout、AcmeDesk 与 Relivus 四件作品。',
  alternates: { canonical: '/projects' },
};

export default function ProjectsPage() {
  const total = String(projects.length).padStart(2, '0');
  const year = projects[0].year;

  return (
    <section className="work">
      <header className="work-hero">
        <h1 className="sr-only" id="work-title">
          作品
        </h1>
        <div className="work-hero-top">
          <p className="eyebrow">作品</p>
          <span className="work-hero-count">
            {total} 件 / {year}
          </span>
        </div>

        <nav className="work-index" aria-label="作品索引">
          {projects.map((project) => (
            <div className="work-index-item" key={project.index}>
              <a className="work-index-link" href={`#exhibit-${project.index}`}>
                <span className="work-index-num">{project.index}</span>
                <span className="work-index-title">{project.title}</span>
              </a>
            </div>
          ))}
        </nav>
      </header>

      <div className="work-list">
        {projects.map((project, index) => (
          <ExhibitEntry key={project.slug} project={project} position={index} />
        ))}
      </div>
    </section>
  );
}
