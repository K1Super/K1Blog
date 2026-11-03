'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { CommentDto } from '@/features/comments/schema';
import { formatDateTime } from '@/lib/utils';
import { MessageForm } from './comment-form';

const THUMB_HEIGHT = 48;
const TRACK_INSET = 8;

type MessageFeed = { data: { items: CommentDto[]; nextCursor: string | null } };

function MessageItem({
  comment,
  replies,
  label,
}: {
  comment: CommentDto;
  replies: CommentDto[];
  label: string;
}) {
  return (
    <li className="comment">
      <div className="comment-meta">
        <span className="comment-num">{label}</span>
        <span className="comment-author">{comment.authorName}</span>
        <time dateTime={comment.createdAt}>{formatDateTime(comment.createdAt)}</time>
      </div>
      <p className="comment-content">{comment.content}</p>
      {replies.length > 0 ? (
        <ul className="comment-list comment-reply">
          {replies.map((reply, index) => (
            <MessageItem
              key={reply.id}
              comment={reply}
              replies={[]}
              label={`${label}.${index + 1}`}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function MessageSection({ targetSlug }: { targetSlug: string }) {
  const [items, setItems] = useState<CommentDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState('');
  const [scrollable, setScrollable] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const streamRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);

  const syncScrollbar = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const max = stream.scrollHeight - stream.clientHeight;
    setScrollable(max > 1);
    const thumb = thumbRef.current;
    if (!thumb) return;
    const usable = Math.max(1, stream.clientHeight - TRACK_INSET * 2 - THUMB_HEIGHT);
    const offset = max > 0 ? (stream.scrollTop / max) * usable : 0;
    thumb.style.transform = `translateY(${offset}px)`;
  }, []);

  useEffect(() => {
    syncScrollbar();
  }, [items, status, syncScrollbar]);

  useEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const observer = new ResizeObserver(syncScrollbar);
    observer.observe(stream);
    return () => observer.disconnect();
  }, [syncScrollbar]);

  function startThumbDrag(event: React.PointerEvent<HTMLSpanElement>) {
    const stream = streamRef.current;
    if (!stream) return;
    const max = stream.scrollHeight - stream.clientHeight;
    if (max <= 0) return;

    event.preventDefault();
    const startY = event.clientY;
    const startTop = stream.scrollTop;
    const usable = Math.max(1, stream.clientHeight - TRACK_INSET * 2 - THUMB_HEIGHT);

    const onMove = (moveEvent: PointerEvent) => {
      stream.scrollTop = startTop + ((moveEvent.clientY - startY) / usable) * max;
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/v1/posts/${targetSlug}/comments`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('comments unavailable');
        return response.json() as Promise<MessageFeed>;
      })
      .then((payload) => {
        setItems(payload.data.items);
        setNextCursor(payload.data.nextCursor);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setStatus('error');
      });

    return () => controller.abort();
  }, [targetSlug, reloadToken]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setMoreError('');
    try {
      const response = await fetch(
        `/api/v1/posts/${targetSlug}/comments?cursor=${encodeURIComponent(nextCursor)}`,
      );
      if (!response.ok) throw new Error('more messages unavailable');
      const payload = (await response.json()) as MessageFeed;
      setItems((previous) => [...previous, ...payload.data.items]);
      setNextCursor(payload.data.nextCursor);
    } catch {
      setMoreError('加载更多留言失败');
    } finally {
      setLoadingMore(false);
    }
  }

  const topLevel = items.filter((item) => item.parentId === null);
  const replies = new Map<string, CommentDto[]>();
  for (const item of items) {
    if (!item.parentId) continue;
    const list = replies.get(item.parentId) ?? [];
    list.push(item);
    replies.set(item.parentId, list);
  }

  const count = String(items.length).padStart(3, '0');

  return (
    <section className="comments" id="messages" aria-labelledby="messages-title">
      <header className="comments-head">
        <h2 className="comments-title" id="messages-title">
          留言
        </h2>
        <span className="comments-count">
          {count}
          {nextCursor ? '+' : ''} 条留言
        </span>
      </header>

      <MessageForm
        targetSlug={targetSlug}
        onPublished={() => {
          setStatus('loading');
          setReloadToken((value) => value + 1);
        }}
      />

      <div className="message-scroll">
        <div
          className="message-stream"
          role="region"
          aria-label="留言列表"
          tabIndex={0}
          ref={streamRef}
          onScroll={syncScrollbar}
        >
          {status === 'loading' ? <p className="muted">正在读取留言</p> : null}
          {status === 'error' ? <p className="form-error">留言暂不可用</p> : null}
          {status === 'ready' && topLevel.length === 0 ? <p className="muted">暂无留言</p> : null}

          {topLevel.length > 0 ? (
            <ul className="comment-list">
              {topLevel.map((comment, index) => (
                <MessageItem
                  key={comment.id}
                  comment={comment}
                  replies={replies.get(comment.id) ?? []}
                  label={String(index + 1).padStart(3, '0')}
                />
              ))}
            </ul>
          ) : null}

          {moreError ? <p className="form-error message-more-error">{moreError}</p> : null}
          {nextCursor ? (
            <button
              className="message-more"
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? '正在加载' : '加载更多留言'}
            </button>
          ) : null}
        </div>

        <span
          className={scrollable ? 'message-scrollbar is-active' : 'message-scrollbar'}
          aria-hidden="true"
        >
          <span className="message-scrollbar-thumb" ref={thumbRef} onPointerDown={startThumbDrag} />
        </span>
      </div>
    </section>
  );
}
