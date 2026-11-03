import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/admin/login-form';
import { getSession } from '@/lib/auth/server';

export const metadata: Metadata = {
  title: '管理登录',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session) redirect('/admin/comments');

  return (
    <section className="gate">
      <h1 className="sr-only">管理登录</h1>
      <p className="eyebrow gate-eyebrow">ADMIN / GATE</p>
      <LoginForm />
    </section>
  );
}
