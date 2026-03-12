import type { Metadata } from 'next';

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
    <html lang="en" data-theme="light">
      <body>
        <a className="skipLink" href="#content">
          Skip to content
        </a>

        <div className="appShell">
          <NavigationHistoryTracker />
          <SiteHeader />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
