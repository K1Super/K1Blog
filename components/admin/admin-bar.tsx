'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { authClient } from '@/lib/auth-client';

export function AdminBar({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();

  async function logout() {
    await authClient.signOut();
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <header className="admin-bar">
      <nav className="admin-nav" aria-label="管理端导航">
        {signedIn ? <Link href="/admin/comments">留言自动化</Link> : null}
        <Link href="/">返回站点</Link>
        {signedIn ? (
          <button className="admin-logout" type="button" onClick={logout}>
            退出
          </button>
        ) : null}
      </nav>
    </header>
  );
}
