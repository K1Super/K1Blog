export function SiteFooter() {
  return (
    <footer className="site-foot" id="site-foot">
      <span className="foot-brand">K1</span>
      <span className="foot-meta">
        <span>写作 · 作品 · {new Date().getFullYear()}</span>
        <span>自托管</span>
      </span>
    </footer>
  );
}
