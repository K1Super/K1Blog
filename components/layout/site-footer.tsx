export function SiteFooter() {
  return (
    <footer className="site-foot" id="site-foot">
      <span className="foot-brand">K1Blog</span>
      <nav className="foot-links" aria-label="站点出口">
        <a href="/feed.xml">订阅 RSS</a>
        <a href="#top">回到顶部</a>
      </nav>
    </footer>
  );
}
