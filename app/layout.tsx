import type { Metadata } from 'next';

import { Grain } from '@/components/layout/grain';
import { site } from '@/lib/site';
import './globals.css';

const themeScript = `(function(){try{var t=localStorage.getItem('k1-theme');if(t==='night'||t==='lamp'){document.documentElement.dataset.theme=t}}catch(e){}})();`;

const description = site.description;
const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000';
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: site.name,
  url: siteUrl,
  description,
  inLanguage: 'zh-CN',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: '博客',
    template: '%s · 博客',
  },
  description,
  applicationName: '博客',
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: '博客',
    title: '博客',
    description,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '博客' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '博客',
    description,
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-theme="night" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body id="top">
        <link
          rel="preload"
          href="/fonts/noto-serif-display.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
          fetchPriority="high"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <a className="skip" href="#main">
          跳到正文
        </a>
        <Grain />
        {children}
      </body>
    </html>
  );
}
