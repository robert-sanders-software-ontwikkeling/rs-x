import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SiteFooter } from '../components/Footer';
import { NavigationHistoryTracker } from '../components/NavigationHistoryTracker';
import { SiteHeader } from '../components/SiteHeader';

import './globals.css';

export const metadata: Metadata = {
  title: 'rs-x — Declarative reactivity for JavaScript/TypeScript',
  description:
    'rs-x is a JavaScript/TypeScript framework for declarative reactivity: bind expressions to a model and updates propagate automatically.',
  metadataBase: new URL('https://example.com'),
  openGraph: {
    title: 'rs-x — Declarative reactivity',
    description:
      'Bind expressions to a model. rs-x builds fine-grained dependencies and updates automatically.',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('rsx-theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <a className="skipLink" href="#content">
          Skip to content
        </a>

        <div className="appShell">
          <Suspense>
            <NavigationHistoryTracker />
          </Suspense>
          <SiteHeader />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
