import type { Metadata } from 'next';

import { ExhibitEntry } from '@/components/work/exhibit-entry';
import { WorkDock } from '@/components/work/work-dock';
import { projects } from '@/lib/projects';

export const metadata: Metadata = {
  title: '作品',
  description: 'Verthys、Terra Scout、AcmeDesk 与 Relivus 四件作品。',
  alternates: { canonical: '/projects' },
};

export default function ProjectsPage() {
  const total = String(projects.length).padStart(3, '0');
  const year = projects[0].year;

  return (
    <section className="work">
      <header className="work-hero">
        <h1 className="sr-only" id="work-title">
          作品
        </h1>
        <div className="work-hero-top">
          <p className="eyebrow">SELECTED WORKS</p>
          <span className="work-hero-count">
            {total} EXHIBITS / {year}
          </span>
        </div>

        <WorkDock items={projects.map(({ index, title }) => ({ index, title }))} />
      </header>

      <div className="work-list">
        {projects.map((project, index) => (
          <ExhibitEntry key={project.slug} project={project} position={index} />
        ))}
      </div>
    </section>
  );
}
