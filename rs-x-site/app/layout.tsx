import type { Metadata } from 'next';

import './globals.css';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/Footer';


export const metadata: Metadata = {
  title: 'rs-x — Declarative reactivity for JavaScript/TypeScript',
  description:
    'rs-x is a JavaScript/TypeScript framework for declarative reactivity: bind expressions to a model and updates propagate automatically.',
  metadataBase: new URL('https://example.com'),
  openGraph: {
    title: 'rs-x — Declarative reactivity',
    description: 'Bind expressions to a model. rs-x builds fine-grained dependencies and updates automatically.',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' data-theme='light'>
      <body>
        <a className='skipLink' href='#content'>
          Skip to content
        </a>

        <div className='appShell'>
          <SiteHeader />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}