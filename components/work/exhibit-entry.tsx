import Link from 'next/link';

import type { Project } from '@/lib/projects';
import { Specimen } from './specimen';

export function ExhibitEntry({ project, position }: { project: Project; position: number }) {
  const align = position % 2 === 0 ? 'left' : 'right';

  return (
    <article className="exhibit" data-align={align} id={`exhibit-${project.index}`}>
      <div className="exhibit-visual">
        <Specimen kind={project.specimen} />
        <Link className="exhibit-visual-link" href={`/projects/${project.slug}`}>
          <span className="sr-only">进入展件：{project.title}</span>
        </Link>
      </div>

      <div className="exhibit-info">
        <div className="exhibit-ledger">
          <span className="exhibit-num">{project.index}</span>
          <span>{project.category}</span>
          <span>{project.year}</span>
        </div>
        <h2 className="exhibit-title">
          <Link href={`/projects/${project.slug}`}>{project.title}</Link>
        </h2>
        <p className="exhibit-latin">{project.latin}</p>
        <p className="exhibit-summary">{project.summary}</p>
        <p className="exhibit-quote">“{project.statement}”</p>

        <ul className="exhibit-facts">
          <li>
            <span>角色</span>
            <span>{project.role}</span>
          </li>
          <li>
            <span>技术栈</span>
            <span>{project.stack.join(' / ')}</span>
          </li>
          <li>
            <span>状态</span>
            <span>{project.status}</span>
          </li>
        </ul>

        <Link className="exhibit-cta" href={`/projects/${project.slug}`}>
          <span>进入展件</span>
          <span className="exhibit-cta-line" aria-hidden="true" />
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
