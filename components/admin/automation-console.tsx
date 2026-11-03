'use client';

import { useState } from 'react';

import type { ModerationPolicy } from '@/features/comments/automation';
import type { AdminCommentDto } from '@/features/comments/schema';
import { AutomationPolicyForm } from './automation-policy-form';
import { CommentLedger } from './comment-ledger';

export function AutomationConsole({
  policy,
  revision,
  csrfToken,
  initialComments,
  initialMeta,
}: {
  policy: ModerationPolicy;
  revision: number;
  csrfToken: string;
  initialComments: AdminCommentDto[];
  initialMeta: { page: number; pageSize: number; total: number };
}) {
  const [reloadToken, setReloadToken] = useState(0);

  return (
    <div className="automation-console">
      <AutomationPolicyForm
        initialPolicy={policy}
        revision={revision}
        csrfToken={csrfToken}
        onSaved={() => setReloadToken((value) => value + 1)}
      />
      <CommentLedger
        initialComments={initialComments}
        initialMeta={initialMeta}
        csrfToken={csrfToken}
        reloadToken={reloadToken}
      />
    </div>
  );
}
