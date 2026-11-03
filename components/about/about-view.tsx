import Link from 'next/link';

import { MessageSection } from '@/components/comments/comment-section';

export function AboutView({
  notesCount,
  worksCount,
  updated,
}: {
  notesCount: string;
  worksCount: string;
  updated: string;
}) {
  return (
    <section className="about-page">
      <header className="about-head">
        <div className="about-top">
          <p className="eyebrow">ABOUT / COLOPHON</p>
          <span className="about-stamp">SELF-HOSTED / 2026</span>
        </div>
        <h1 className="sr-only" id="about-title">
          关于
        </h1>
        <p className="about-statement">写作是校准，作品是证据</p>
      </header>

      <div className="about-layout">
        <div className="about-main">
          <section className="about-section">
            <div className="about-section-head">
              <span className="about-section-num">01</span>
              <span>THE SITE / 这个站点</span>
            </div>
            <h2 className="about-section-title">把内容放进自己的容器</h2>
            <div className="about-section-body">
              <p>
                这里不是内容平台的镜像，而是一个自托管的长文容器。文章以 MDX
                存放在仓库里，页面在构建期生成，检索索引随内容一起产出；SQLite 只负责留言与会话。
              </p>
              <p>
                页面把编号、日期、阅读时长与目录放在边缘，把中央留给正文。深色是默认阅读环境，浅色是另一种阅读状态；它们不是两套设计，而是同一内容在两种光线下的呈现。
              </p>
            </div>
          </section>

          <section className="about-section">
            <div className="about-section-head">
              <span className="about-section-num">02</span>
              <span>WRITING / 写作</span>
            </div>
            <h2 className="about-section-title">把判断写下来，再回来校准</h2>
            <div className="about-section-body">
              <p>
                每一篇都会经过一次结构检查：标题是否准确，论证是否有据，例子是否必要，结论是否超出了证据。写完之后放一夜，第二天再读一遍，是这里最常见的工作方式。
              </p>
              <p>
                不追热点，也不追更新频率。这里只保留那些值得被反复校准的判断——慢一点，但每一篇都对得起自己的结论。
              </p>
            </div>
          </section>

          <section className="about-section">
            <div className="about-section-head">
              <span className="about-section-num">03</span>
              <span>WORKS / 作品</span>
            </div>
            <h2 className="about-section-title">四件可以被审阅的作品</h2>
            <div className="about-section-body">
              <p>
                写作之外，这个站点也陈列四件真实作品：Verthys、Terra Scout、AcmeDesk 与
                Relivus。它们不是展示用的样本，而是可以查看源码、可以被审阅的系统。
              </p>
              <p>作品页面记录结构、边界与取舍；源码在 GitHub 上，可以继续往下读。</p>
            </div>
            <Link className="about-link" href="/projects">
              查看作品 <span aria-hidden="true">→</span>
            </Link>
          </section>

          <section className="about-section">
            <div className="about-section-head">
              <span className="about-section-num">04</span>
              <span>BOUNDARIES / 边界</span>
            </div>
            <h2 className="about-section-title">不采集，也不打扰</h2>
            <div className="about-section-body">
              <p>
                留言先进入待审队列，通过之后才会出现在这里。这里只需要昵称与留言内容，不收集邮箱，也不采集与阅读无关的信息。
              </p>
              <p>
                焦点环、44px 触控目标、对比度与减少动效模式都在组件层实现。装饰可以消失，结构不会。
              </p>
            </div>
          </section>

          <footer className="about-foot">
            <span>LAST NOTE / {updated}</span>
          </footer>
        </div>

        <aside className="about-facts" aria-label="站点信息与留言">
          <span className="about-facts-label">COLOPHON / 2026</span>
          <div className="about-fact">
            <span>WORKS</span>
            <span>{worksCount}</span>
          </div>
          <div className="about-fact">
            <span>NOTES</span>
            <span>{notesCount}</span>
          </div>
          <div className="about-fact">
            <span>THEMES</span>
            <span>02</span>
          </div>
          <div className="about-fact">
            <span>BASE</span>
            <span>SELF-HOSTED</span>
          </div>
          <div className="about-fact">
            <span>STACK</span>
            <span>NEXT.JS / SQLITE</span>
          </div>
          <div className="about-messages">
            <MessageSection targetSlug="about" />
          </div>
        </aside>
      </div>
    </section>
  );
}
