'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { authClient } from '@/lib/auth-client';

export function LoginForm() {
  const router = useRouter();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');

    const result = await authClient.signIn.username({
      username: account,
      password,
    });

    if (result.error) {
      setError(result.error.message || '登录失败');
      setPending(false);
      return;
    }

    router.replace('/admin/comments');
    router.refresh();
  }

  return (
    <form className="gate-form" onSubmit={onSubmit}>
      <div className="gate-ledger">
        <span className="gate-axis" aria-hidden="true" />
        <div className="gate-row">
          <span className="gate-index" aria-hidden="true">
            01
          </span>
          <label className="gate-label" htmlFor="admin-account">
            账户
          </label>
          <input
            className="gate-input"
            id="admin-account"
            name="account"
            type="text"
            value={account}
            onChange={(event) => setAccount(event.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="gate-row">
          <span className="gate-index" aria-hidden="true">
            02
          </span>
          <label className="gate-label" htmlFor="admin-password">
            密码
          </label>
          <input
            className="gate-input"
            id="admin-password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
      </div>
      {error ? (
        <p className="gate-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="gate-actions">
        <button className="gate-submit" type="submit" disabled={pending}>
          <span>{pending ? '登录中' : '登录'}</span>
          <span className="gate-submit-arrow" aria-hidden="true">
            →
          </span>
        </button>
      </div>
    </form>
  );
}
