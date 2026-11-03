import { Masthead } from '@/components/layout/masthead';
import { Rail } from '@/components/layout/rail';
import { SiteFooter } from '@/components/layout/site-footer';

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Rail />
      <Masthead />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
