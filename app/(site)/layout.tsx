import { Masthead } from '@/components/layout/masthead';
import { SiteFooter } from '@/components/layout/site-footer';

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Masthead />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
