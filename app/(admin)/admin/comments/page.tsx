import type { Metadata } from 'next';

import { AutomationConsole } from '@/components/admin/automation-console';
import { ModerationOverview } from '@/components/admin/moderation-overview';
import { requireAdminPage } from '@/features/admin/auth';
import { getModerationMetrics, listAdminComments } from '@/features/comments/admin-service';
import { loadModerationPolicy } from '@/features/comments/policy-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '留言自动化',
  robots: { index: false, follow: false },
};

export default async function AdminCommentsPage() {
  const { csrfToken } = await requireAdminPage();
  const policy = loadModerationPolicy();
  const metrics = getModerationMetrics();
  const result = listAdminComments('all', 1, 20);

  return (
    <section className="admin-page automation-page">
      <header className="admin-head">
        <div>
          <p className="eyebrow">ADMIN / AUTOMATION</p>
          <h1 className="admin-title">留言自动化</h1>
        </div>
        <div className="automation-head-meta">
          <span>{String(result.total).padStart(3, '0')} 条留言</span>
          <span>{policy.policy.enabled ? 'AUTO ON' : 'AUTO OFF'}</span>
        </div>
      </header>

      <ModerationOverview metrics={metrics} policy={policy} />

      <AutomationConsole
        policy={policy.policy}
        revision={policy.revision}
        csrfToken={csrfToken}
        initialComments={result.items}
        initialMeta={{ page: result.page, pageSize: result.pageSize, total: result.total }}
      />
    </section>
  );
}
