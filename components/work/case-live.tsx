import Link from 'next/link';

import type { Project } from '@/lib/projects';

export function CaseLive({ project }: { project: Project }) {
  const content = (
    <>
      <span>{project.liveLabel}</span>
      <span aria-hidden="true">→</span>
    </>
  );

  if (/^https?:\/\//.test(project.liveHref)) {
    return (
      <a className="case-live" href={project.liveHref} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }

  return (
    <Link className="case-live" href={project.liveHref}>
      {content}
    </Link>
  );
}
