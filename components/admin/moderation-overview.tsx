import type { ModerationMetrics } from '@/features/comments/admin-service';
import type { ModerationPolicySnapshot } from '@/features/comments/policy-service';
import { formatDateTime } from '@/lib/utils';

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="automation-metric">
      <span className="automation-metric-value">{String(value).padStart(3, '0')}</span>
      <span className="automation-metric-label">{label}</span>
    </div>
  );
}

export function ModerationOverview({
  metrics,
  policy,
}: {
  metrics: ModerationMetrics;
  policy: ModerationPolicySnapshot;
}) {
  const stateLabel =
    policy.source === 'fallback' ? '安全回退' : policy.policy.enabled ? '自动运行' : '已暂停';

  return (
    <section className="automation-overview" aria-label="自动审核概览">
      <div className="automation-status-line">
        <span
          className={
            policy.source === 'fallback'
              ? 'automation-state is-fallback'
              : policy.policy.enabled
                ? 'automation-state'
                : 'automation-state is-paused'
          }
        >
          <span className="automation-state-dot" aria-hidden="true" />
          {stateLabel}
        </span>
        <span>REV {String(policy.revision).padStart(3, '0')}</span>
        <span>
          {policy.updatedAt ? `UPDATED ${formatDateTime(policy.updatedAt)}` : 'DEFAULT POLICY'}
        </span>
      </div>

      {policy.source === 'fallback' ? (
        <p className="form-error">策略配置损坏，已回退到全量待审</p>
      ) : null}

      <div className="automation-metrics">
        <Metric value={metrics.pending} label="待审队列" />
        <Metric value={metrics.approved} label="已发布" />
        <Metric value={metrics.autoApproved24h} label="24H 自动发布" />
        <Metric value={metrics.autoBlocked24h} label="24H 自动拦截" />
      </div>
    </section>
  );
}
