import Link from 'next/link';

import type { Project } from '@/lib/projects';
import { CaseLive } from './case-live';
import { CaseMedia } from './case-media';

export function CaseView({ project, next }: { project: Project; next: Project }) {
  return (
    <article className="work-case">
      <header className="case-head">
        <div className="case-head-top">
          <Link className="case-back" href="/projects">
            <span aria-hidden="true">←</span> 返回展览
          </Link>
          <span className="case-ledger">
            EXHIBIT {project.index} / {project.category} / {project.year}
          </span>
        </div>

        <h1 className="case-title">{project.title}</h1>
        <p className="case-latin">{project.latin}</p>

        <div className="case-intro">
          <p className="case-summary">{project.summary}</p>
          <p className="case-quote">“{project.statement}”</p>
        </div>

        <dl className="case-facts">
          {project.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <CaseMedia project={project} />

      <div className="case-body">
        <ol className="case-chapters">
          {project.chapters.map((chapter) => (
            <li key={chapter.index}>
              <div className="case-chapter-head">
                <span className="case-chapter-num">{chapter.index}</span>
                <span>{chapter.kicker}</span>
              </div>
              <h2 className="case-chapter-title">{chapter.title}</h2>
              <div className="case-chapter-body">
                {chapter.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </li>
          ))}
        </ol>

        <aside className="case-aside" aria-label="项目信息">
          <div>
            <p className="case-aside-label">STACK</p>
            <ul className="case-stack">
              {project.stack.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="case-aside-label">STATUS</p>
            <p className="case-aside-value">{project.status}</p>
          </div>
          <CaseLive project={project} />
        </aside>
      </div>

      <section className="case-metrics" aria-label="作品数据">
        {project.metrics.map((metric) => (
          <div key={metric.label}>
            <span className="case-metric-value">{metric.value}</span>
            <span className="case-metric-label">{metric.label}</span>
          </div>
        ))}
      </section>

      <nav className="case-next" aria-label="下一件展品">
        <span className="case-next-label">NEXT EXHIBIT / {next.index}</span>
        <Link className="case-next-link" href={`/projects/${next.slug}`}>
          <span>{next.title}</span>
          <span>{next.latin}</span>
          <span aria-hidden="true">→</span>
        </Link>
      </nav>
    </article>
  );
}
