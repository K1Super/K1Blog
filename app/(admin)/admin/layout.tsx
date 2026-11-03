import type { Metadata } from 'next';

import { AdminBar } from '@/components/admin/admin-bar';
import { getSession } from '@/lib/auth/server';

export const metadata: Metadata = {
  title: '管理端',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();

  return (
    <div className="admin-shell">
      <AdminBar signedIn={Boolean(session)} />
      <main>{children}</main>
    </div>
  );
}
