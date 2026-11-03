import Image from 'next/image';
import Link from 'next/link';

import { projects } from '@/lib/projects';

type PlateKind = 'image' | 'scout' | 'cert' | 'relivus';

const PLATE_BY_SLUG: Record<string, PlateKind> = {
  verthys: 'image',
  'terra-scout': 'scout',
  'acme-desk': 'cert',
  relivus: 'relivus',
};

const CERT_ROWS = [
  { domain: 'acme.example', state: 'VALID' },
  { domain: 'api.example', state: 'VALID' },
  { domain: 'stage.example', state: 'STAGING' },
] as const;

const RELIVUS_CELLS = Array.from({ length: 24 }, (_, index) => ({
  key: index,
  filled: [0, 2, 5, 7, 10, 13, 16, 19].includes(index),
  primary: [3, 14].includes(index),
}));

function ScoutPlate() {
  return (
    <span className="plate plate-scout" aria-hidden="true">
      <span className="plate-scout-main">
        <span className="plate-scout-count">09</span>
        <span className="plate-scout-bars">
          {Array.from({ length: 9 }, (_, index) => (
            <i
              key={index}
              className={index < 4 ? 'is-done' : index === 4 ? 'is-active' : undefined}
            />
          ))}
        </span>
      </span>
      <span className="plate-foot">STEPS · 438+ TESTS</span>
    </span>
  );
}

function CertPlate() {
  return (
    <span className="plate plate-cert" aria-hidden="true">
      <span className="plate-cert-rows">
        {CERT_ROWS.map((row) => (
          <span key={row.domain} className="plate-cert-row">
            <span>{row.domain}</span>
            <b className={row.state === 'VALID' ? 'is-valid' : 'is-staging'}>{row.state}</b>
          </span>
        ))}
      </span>
      <span className="plate-foot">06 CERTS · 01 JOB</span>
    </span>
  );
}

function RelivusPlate() {
  return (
    <span className="plate plate-relivus" aria-hidden="true">
      <span className="plate-relivus-grid">
        {RELIVUS_CELLS.map((cell) => (
          <i
            key={cell.key}
            className={cell.primary ? 'is-primary' : cell.filled ? 'is-filled' : undefined}
          />
        ))}
      </span>
      <span className="plate-foot">02 DIALECTS · AES-256</span>
    </span>
  );
}

function Plate({ kind }: { kind: Exclude<PlateKind, 'image'> }) {
  if (kind === 'scout') return <ScoutPlate />;
  if (kind === 'cert') return <CertPlate />;
  return <RelivusPlate />;
}

export function ResultShelf() {
  return (
    <section className="results" aria-labelledby="results-title">
      <div className="results-head">
        <h2 className="results-label" id="results-title" aria-label="成果图">
          SELECTED RESULTS
        </h2>
        <span className="results-year">MMXXVI</span>
      </div>

      <div className="results-strip">
        {projects.map((project) => {
          const kind = PLATE_BY_SLUG[project.slug] ?? 'scout';

          return (
            <Link
              key={project.slug}
              className="result-card"
              data-kind={kind}
              href={`/projects/${project.slug}`}
            >
              <span className="result-figure">
                {kind === 'image' && project.hero ? (
                  <Image
                    className="result-image"
                    src={project.hero}
                    alt={`${project.title} 项目成果图`}
                    fill
                    unoptimized
                    sizes="(min-width: 721px) 240px, 170px"
                  />
                ) : (
                  <Plate kind={kind === 'image' ? 'scout' : kind} />
                )}
              </span>
              <span className="result-caption">
                <span className="result-index">{project.index}</span>
                <span className="result-title">{project.title}</span>
                <span className="result-arrow" aria-hidden="true">
                  →
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
