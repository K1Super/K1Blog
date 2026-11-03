import Image from 'next/image';

import type { Project } from '@/lib/projects';
import { Specimen } from './specimen';

export function CaseMedia({ project }: { project: Project }) {
  const [heroWidth = 1600, heroHeight = 620] = project.heroRatio
    ? project.heroRatio.split('/').map((value) => Number(value.trim()))
    : [];
  const plateLabel = project.hero
    ? (project.heroLabel ?? project.specimenLabel)
    : project.specimenLabel;

  return (
    <>
      <figure className="case-plate">
        <div
          className="case-plate-frame"
          style={project.heroRatio ? { aspectRatio: project.heroRatio } : undefined}
        >
          {project.hero ? (
            <Image
              className="case-hero"
              src={project.hero}
              alt={`${project.title} 项目主视觉`}
              width={heroWidth}
              height={heroHeight}
              unoptimized
            />
          ) : (
            <Specimen kind={project.specimen} />
          )}
        </div>
        <figcaption>
          <span>FIG. {project.index}</span>
          <span>{plateLabel}</span>
        </figcaption>
      </figure>

      {project.diagram ? (
        <figure className="case-diagram">
          <div className="case-diagram-frame" style={{ aspectRatio: project.diagram.ratio }}>
            <Image
              src={project.diagram.src}
              alt={project.diagram.caption}
              width={1600}
              height={830}
              unoptimized
            />
          </div>
          <figcaption>
            <span>APPENDIX / SYSTEM</span>
            <span>{project.diagram.caption}</span>
          </figcaption>
        </figure>
      ) : null}
    </>
  );
}
