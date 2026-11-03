import { workProjects } from './project-data/works';

export type SpecimenKind = 'vault' | 'scout' | 'cert' | 'relivus';

export type ProjectFact = {
  label: string;
  value: string;
};

export type ProjectChapter = {
  index: string;
  kicker: string;
  title: string;
  body: string[];
};

export type ProjectMetric = {
  value: string;
  label: string;
};

export type ProjectDiagram = {
  src: string;
  ratio: string;
  caption: string;
};

export type Project = {
  slug: string;
  index: string;
  title: string;
  latin: string;
  category: string;
  year: string;
  role: string;
  status: string;
  summary: string;
  statement: string;
  specimen: SpecimenKind;
  specimenLabel: string;
  hero?: string;
  heroRatio?: string;
  heroLabel?: string;
  diagram?: ProjectDiagram;
  facts: ProjectFact[];
  chapters: ProjectChapter[];
  metrics: ProjectMetric[];
  stack: string[];
  liveHref: string;
  liveLabel: string;
};

export const projects = workProjects as [Project, ...Project[]];

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}

export function getNextProject(slug: string): Project {
  const index = projects.findIndex((project) => project.slug === slug);
  return projects[(index + 1) % projects.length] ?? projects[0];
}
