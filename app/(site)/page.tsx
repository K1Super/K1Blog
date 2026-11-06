import type { CSSProperties } from 'react';
import Link from 'next/link';

import { SpotlightField } from '@/components/home/spotlight-field';
import { Specimen } from '@/components/work/specimen';
import { getAllPosts } from '@/features/content';
import { projects } from '@/lib/projects';
import { site } from '@/lib/site';
import { formatDate, padIndex, postHref, readingLabel } from '@/lib/utils';

function delay(ms: number): CSSProperties {
  return { '--delay': `${ms}ms` } as CSSProperties;
}

export default function HomePage() {
  const posts = getAllPosts();
  const current = posts[0];
  const others = posts.slice(1);
  const coverWork = projects[0];
  const otherWorks = projects.slice(1);

  return (
    <div className="home-stage">
      <SpotlightField />

      <section className="cover" aria-labelledby="home-title">
        <div className="cover-inner">
          <p className="eyebrow reveal" style={delay(80)}>
            写作与作品，自存于此
          </p>
          <h1 className="cover-title reveal" id="home-title" style={delay(160)}>
            <span className="cover-title-line">把判断写下来</span>
            <span className="cover-title-line cover-title-second">再反复校准</span>
          </h1>
          <div className="cover-foot reveal" style={delay(240)}>
            <p className="cover-kicker">{site.kicker}</p>
          </div>
        </div>
      </section>

      {current ? (
        <section className="issue" aria-labelledby="home-issue-title">
          <div className="section-line">
            <h2 className="section-label" id="home-issue-title">
              本期
            </h2>
            <span className="section-meta">{formatDate(current.publishedAt)}</span>
          </div>

          <div className="issue-body">
            <p className="issue-note">
              长文的价值不在于快，而在于被反复校对之后仍然成立。这一篇，是最近一次校准的结果。
            </p>
            <Link className="issue-link" href={postHref(current.slug)}>
              <span className="issue-title">{current.title}</span>
              <span className="issue-foot">
                <span>{readingLabel(current.readingMinutes)}</span>
                <span className="issue-more">
                  阅读本期 <span aria-hidden="true">→</span>
                </span>
              </span>
            </Link>
          </div>
        </section>
      ) : null}

      <section className="cover-work" aria-labelledby="home-work-title">
        <div className="section-line">
          <h2 className="section-label" id="home-work-title">
            封面作品
          </h2>
          <Link className="all-link" href="/projects">
            全部作品 <span aria-hidden="true">→</span>
          </Link>
        </div>

        <Link className="cover-work-link" href={`/projects/${coverWork.slug}`}>
          <span className="cover-work-visual">
            <Specimen kind={coverWork.specimen} />
            <span className="sr-only">查看作品：{coverWork.title}</span>
          </span>
          <span className="cover-work-foot">
            <span className="cover-work-id">
              {coverWork.index} · {coverWork.category} · {coverWork.year}
            </span>
            <span className="cover-work-title">{coverWork.title}</span>
            <span className="cover-work-note">
              四件作品里的第一件。界面只负责呈现，边界在下层先行立住。
            </span>
            <span className="cover-work-more">
              查看完整案例 <span aria-hidden="true">→</span>
            </span>
          </span>
        </Link>

        <p className="other-works">
          <span className="other-works-label">其余作品</span>
          {otherWorks.map((project) => (
            <Link key={project.slug} href={`/projects/${project.slug}`}>
              {project.title}
            </Link>
          ))}
        </p>
      </section>

      {others.length > 0 ? (
        <p className="other-notes">
          <span className="other-works-label">此前</span>
          {others.map((post, index) => (
            <Link key={post.slug} href={postHref(post.slug)}>
              {padIndex(index + 1)} {post.title}
            </Link>
          ))}
        </p>
      ) : null}

      <section className="home-close" aria-label="关于这个站点">
        <Link className="close-statement" href="/about">
          <span className="close-line">留下的判断，都要经得起回看</span>
          <span className="close-more">
            关于这个站点 <span aria-hidden="true">→</span>
          </span>
        </Link>
      </section>
    </div>
  );
}
