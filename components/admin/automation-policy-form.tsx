'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { ModerationPolicy } from '@/features/comments/automation';
import { PolicyFields, toDraft, toPolicy, type PolicyDraft } from './automation-policy-fields';

type SaveResult = {
  snapshot: {
    policy: ModerationPolicy;
    revision: number;
  };
};

type Problem = {
  detail?: string;
  errors?: Array<{ field: string; message: string }>;
};

type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

const SAVE_DELAY_MS = 600;

const saveStateLabels: Record<SaveState, string> = {
  idle: '自动保存',
  pending: '待保存',
  saving: '保存中',
  saved: '已保存',
  error: '保存失败',
};

export function AutomationPolicyForm({
  initialPolicy,
  revision,
  csrfToken,
  onSaved,
}: {
  initialPolicy: ModerationPolicy;
  revision: number;
  csrfToken: string;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => toDraft(initialPolicy));
  const draftRef = useRef(draft);
  const [savedRevision, setSavedRevision] = useState(revision);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const lastSavedRef = useRef(JSON.stringify(toPolicy(toDraft(initialPolicy))));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  function scheduleSave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaveState('pending');
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void performSave();
    }, SAVE_DELAY_MS);
  }

  async function performSave() {
    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }

    const policy = toPolicy(draftRef.current);
    const serialized = JSON.stringify(policy);
    if (serialized === lastSavedRef.current) {
      setSaveState('saved');
      return;
    }

    if (policy.autoBlockMinRisk <= policy.autoApproveMaxRisk) {
      setFieldErrors({ autoBlockMinRisk: '自动拦截下限必须大于自动发布上限' });
      setSaveState('error');
      return;
    }

    inFlightRef.current = true;
    setSaveState('saving');
    setSaveError('');

    try {
      const response = await fetch('/api/v1/admin/moderation/policy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify(policy),
      });
      const body = (await response.json().catch(() => ({}))) as Problem & { data?: SaveResult };

      if (!response.ok) {
        setFieldErrors(
          Object.fromEntries(
            (body.errors ?? []).map((item) => [item.field.split('.')[0] ?? 'body', item.message]),
          ),
        );
        setSaveError(body.errors?.length ? '' : (body.detail ?? '自动保存失败'));
        setSaveState('error');
        return;
      }

      const result = body.data;
      if (!result?.snapshot) {
        setSaveError('保存响应不完整');
        setSaveState('error');
        return;
      }

      lastSavedRef.current = serialized;
      setSavedRevision(result.snapshot.revision);
      setSaveState('saved');
      onSaved();
      router.refresh();
    } catch {
      setSaveError('自动保存失败');
      setSaveState('error');
    } finally {
      inFlightRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        void performSave();
      }
    }
  }

  function update(values: Partial<PolicyDraft>) {
    const next = { ...draftRef.current, ...values };
    draftRef.current = next;
    setDraft(next);
    setFieldErrors({});
    setSaveError('');
    scheduleSave();
  }

  return (
    <section className="automation-panel" aria-labelledby="automation-policy-title">
      <header className="automation-panel-head">
        <div>
          <p className="eyebrow">POLICY / PARAMETERS</p>
          <h2 className="automation-title" id="automation-policy-title">
            自动审核参数
          </h2>
        </div>
        <div className="policy-save-meta">
          <span className="automation-revision">REV {String(savedRevision).padStart(3, '0')}</span>
          <span className={`policy-save-state is-${saveState}`} role="status" aria-live="polite">
            {saveStateLabels[saveState]}
          </span>
        </div>
      </header>

      {saveError ? (
        <p className="form-error policy-save-error" role="alert">
          {saveError}
        </p>
      ) : null}

      <form
        className="automation-form"
        onSubmit={(event) => event.preventDefault()}
        onBlur={(event) => {
          const next = event.relatedTarget as Node | null;
          if (next && event.currentTarget.contains(next)) return;
          if (JSON.stringify(toPolicy(draftRef.current)) === lastSavedRef.current) return;
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          void performSave();
        }}
      >
        <PolicyFields draft={draft} fieldErrors={fieldErrors} update={update} />
      </form>
    </section>
  );
}
