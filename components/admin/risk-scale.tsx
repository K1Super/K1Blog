export function RiskScale({ approve, block }: { approve: number; block: number }) {
  return (
    <div className="policy-scale-block" aria-labelledby="policy-scale-title">
      <div className="policy-scale-head">
        <span id="policy-scale-title">风险刻度</span>
        <span>RISK 000—100</span>
      </div>
      <div className="automation-scale" aria-hidden="true">
        <div className="automation-scale-ticks">
          {Array.from({ length: 11 }, (_, index) => (
            <span key={index} style={{ left: `${index * 10}%` }} />
          ))}
        </div>
        <div className="automation-scale-track">
          <span className="automation-zone is-approve" style={{ width: `${approve}%` }} />
          <span
            className="automation-zone is-pending"
            style={{ width: `${Math.max(0, block - approve)}%` }}
          />
          <span className="automation-zone is-block" style={{ width: `${100 - block}%` }} />
        </div>
        <span className="automation-marker" style={{ left: `${approve}%` }}>
          {approve}
        </span>
        <span className="automation-marker is-block" style={{ left: `${block}%` }}>
          {block}
        </span>
        <div className="automation-scale-edge">
          <span>000</span>
          <span>100</span>
        </div>
      </div>
      <dl className="policy-scale-legend">
        <div>
          <dt>发布</dt>
          <dd>0—{approve}</dd>
        </div>
        <div>
          <dt>待审</dt>
          <dd>
            {approve}—{block}
          </dd>
        </div>
        <div>
          <dt>拦截</dt>
          <dd>{block}—100</dd>
        </div>
      </dl>
    </div>
  );
}
