'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { AdminCommentDto, CommentStatus } from '@/features/comments/schema';
import { commentFilters as filters, type CommentFilter } from './comment-ledger-meta';
import { CommentLedgerRow } from './comment-ledger-row';

type ListMeta = {
  page: number;
  pageSize: number;
  total: number;
};

type ListResponse = {
  data: { items: AdminCommentDto[] };
  meta: ListMeta;
};

export function CommentLedger({
  initialComments,
  initialMeta,
  csrfToken,
  reloadToken,
}: {
  initialComments: AdminCommentDto[];
  initialMeta: ListMeta;
  csrfToken: string;
  reloadToken: number;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialComments);
  const [meta, setMeta] = useState(initialMeta);
  const [filter, setFilter] = useState<CommentFilter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const requestRef = useRef(0);
  const pageSizeRef = useRef(initialMeta.pageSize);
  const listRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef({ page: initialMeta.page, filter: 'all' as CommentFilter });

  const load = useCallback(
    async (nextPage: number, nextFilter: CommentFilter, preserveScroll = false) => {
      const request = requestRef.current + 1;
      requestRef.current = request;
      setFilter(nextFilter);
      viewRef.current = { page: nextPage, filter: nextFilter };
      setLoading(true);
      setError('');
      setConfirmId(null);
      if (!preserveScroll) {
        setExpandedIds(new Set());
        if (listRef.current) listRef.current.scrollTop = 0;
      }

      try {
        const response = await fetch(
          `/api/v1/admin/comments?status=${nextFilter}&page=${nextPage}&pageSize=${pageSizeRef.current}`,
        );
        const body = (await response.json().catch(() => ({}))) as ListResponse & {
          detail?: string;
        };
        if (request !== requestRef.current) return;
        if (!response.ok) {
          setError(body.detail ?? '读取留言失败');
          return;
        }
        setItems(body.data.items);
        setMeta(body.meta);
        pageSizeRef.current = body.meta.pageSize;
      } catch {
        if (request === requestRef.current) setError('读取留言失败');
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (reloadToken === 0) return;
    const view = viewRef.current;
    void load(view.page, view.filter, true);
  }, [reloadToken, load]);

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function moderate(id: string, status: 'approved' | 'rejected' | 'spam') {
    setPendingId(id);
    setError('');
    try {
      const response = await fetch(`/api/v1/admin/comments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ status }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        data?: { status?: CommentStatus };
        detail?: string;
      };
      if (!response.ok) {
        setError(body.detail ?? '处置失败');
        return;
      }
      router.refresh();
      await load(viewRef.current.page, viewRef.current.filter, true);
    } catch {
      setError('处置请求失败');
    } finally {
      setPendingId(null);
    }
  }

  async function remove(id: string) {
    setPendingId(id);
    setError('');
    try {
      const response = await fetch(`/api/v1/admin/comments/${id}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': csrfToken },
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { detail?: string };
        setError(body.detail ?? '删除失败');
        return;
      }
      setConfirmId(null);
      const nextPage =
        items.length === 1 && viewRef.current.page > 1
          ? viewRef.current.page - 1
          : viewRef.current.page;
      router.refresh();
      await load(nextPage, viewRef.current.filter, nextPage === viewRef.current.page);
    } catch {
      setError('删除请求失败');
    } finally {
      setPendingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const offset = (meta.page - 1) * meta.pageSize;

  return (
    <section className="automation-ledger" aria-labelledby="automation-ledger-title">
      <header className="automation-panel-head automation-ledger-head">
        <div>
          <p className="eyebrow">LEDGER / MESSAGES</p>
          <h2 className="automation-title" id="automation-ledger-title">
            留言台账
          </h2>
        </div>
        <div className="automation-ledger-tools">
          <nav className="ledger-filters" aria-label="留言状态筛选">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                className={filter === item.value ? 'ledger-filter is-active' : 'ledger-filter'}
                aria-pressed={filter === item.value}
                disabled={loading}
                onClick={() => void load(1, item.value)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <span className="automation-revision">
            {String(meta.total).padStart(3, '0')} 条 / PAGE {String(meta.page).padStart(3, '0')}
          </span>
        </div>
      </header>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div aria-busy={loading} className="ledger-list-wrap" ref={listRef}>
        {loading ? <p className="ledger-loading">读取中</p> : null}
        {!loading && items.length === 0 ? <p className="ledger-empty">没有符合条件的留言</p> : null}

        {items.length > 0 ? (
          <ul className="ledger-list">
            {items.map((comment, index) => (
              <CommentLedgerRow
                key={comment.id}
                comment={comment}
                index={index}
                offset={offset}
                expanded={expandedIds.has(comment.id)}
                pendingId={pendingId}
                confirmId={confirmId}
                onToggleExpand={toggleExpanded}
                onModerate={(id, status) => void moderate(id, status)}
                onConfirmDelete={setConfirmId}
                onDelete={(id) => void remove(id)}
                onCancelDelete={() => setConfirmId(null)}
              />
            ))}
          </ul>
        ) : null}
      </div>

      <div className="ledger-foot">
        <span>
          PAGE {String(meta.page).padStart(3, '0')} / {String(totalPages).padStart(3, '0')}
        </span>
        <div className="ledger-pager">
          <button
            type="button"
            disabled={loading || meta.page <= 1}
            onClick={() => void load(meta.page - 1, filter)}
          >
            上一页
          </button>
          <button
            type="button"
            disabled={loading || meta.page >= totalPages}
            onClick={() => void load(meta.page + 1, filter)}
          >
            下一页
          </button>
        </div>
      </div>
    </section>
  );
}
