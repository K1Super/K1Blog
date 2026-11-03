'use client';

import { useEffect, useRef, useState } from 'react';

type FormState = 'idle' | 'pending' | 'success' | 'error';

function newIdempotencyKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function MessageForm({
  targetSlug,
  onPublished,
}: {
  targetSlug: string;
  onPublished?: () => void;
}) {
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const formStartedAt = useRef<number | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  useEffect(() => {
    formStartedAt.current = Date.now();
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'pending') return;

    setState('pending');
    setError('');
    setSuccessMessage('');

    if (!idempotencyKey.current) idempotencyKey.current = newIdempotencyKey();
    const startedAt = formStartedAt.current ?? Date.now();

    try {
      const response = await fetch(`/api/v1/posts/${targetSlug}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey.current,
        },
        body: JSON.stringify({
          authorName,
          content,
          website,
          formStartedAt: startedAt,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        detail?: string;
        data?: { status?: 'approved' | 'pending' };
      };

      if (!response.ok) {
        setError(payload.detail ?? '提交失败');
        setState('error');
        return;
      }

      const published = payload.data?.status === 'approved';
      setSuccessMessage(published ? '已发布' : '已收到，待审核');
      setState('success');
      setAuthorName('');
      setContent('');
      setWebsite('');
      formStartedAt.current = Date.now();
      idempotencyKey.current = newIdempotencyKey();
      if (published) onPublished?.();
    } catch {
      setError('提交请求失败');
      setState('error');
    }
  }

  return (
    <form className="comment-form" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="message-name">昵称</label>
        <input
          id="message-name"
          name="authorName"
          type="text"
          value={authorName}
          onChange={(event) => setAuthorName(event.target.value)}
          maxLength={40}
          required
          autoComplete="nickname"
        />
      </div>

      <div className="field">
        <label htmlFor="message-content">留言</label>
        <textarea
          id="message-content"
          name="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={2000}
          required
        />
      </div>

      <input
        className="honeypot"
        name="website"
        type="text"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-label="Website"
      />

      {state === 'error' ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {state === 'success' ? (
        <p className="form-success" role="status">
          {successMessage}
        </p>
      ) : null}

      <div className="form-actions">
        <button className="submit-button" type="submit" disabled={state === 'pending'}>
          {state === 'pending' ? '提交中' : '提交留言'}
        </button>
      </div>
    </form>
  );
}
