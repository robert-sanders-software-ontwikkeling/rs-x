import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SiteFooter } from '../components/Footer';
import { NavigationHistoryTracker } from '../components/NavigationHistoryTracker';
import { SiteHeader } from '../components/SiteHeader';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'rs-x — Declarative reactivity for JavaScript & TypeScript',
    template: '%s | rs-x',
  },
  description:
    'rs-x is a JavaScript/TypeScript library for declarative reactivity: bind expressions to a model and updates propagate automatically — no compilation step required.',
  metadataBase: new URL('https://rsxjs.com'),
  openGraph: {
    title: 'rs-x — Declarative reactivity for JavaScript & TypeScript',
    description:
      'Bind expressions to a model. rs-x builds fine-grained dependencies and propagates updates automatically — no compilation step required.',
    url: 'https://rsxjs.com',
    siteName: 'rs-x',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'rs-x — Declarative reactivity for JavaScript & TypeScript',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'rs-x — Declarative reactivity for JavaScript & TypeScript',
    description:
      'Bind expressions to a model. rs-x builds fine-grained dependencies and propagates updates automatically.',
    images: ['/opengraph-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': 'https://rsxjs.com/#organization',
                  name: 'rs-x',
                  url: 'https://rsxjs.com',
                  logo: 'https://rsxjs.com/rsx-logo.svg',
                  sameAs: [
                    'https://github.com/robert-sanders-software-ontwikkeling/rs-x',
                  ],
                },
                {
                  '@type': 'SoftwareApplication',
                  '@id': 'https://rsxjs.com/#software',
                  name: 'rs-x',
                  applicationCategory: 'DeveloperApplication',
                  operatingSystem: 'Any',
                  url: 'https://rsxjs.com',
                  description:
                    'A JavaScript/TypeScript library for declarative reactivity: bind expressions to a model and updates propagate automatically — no compilation step required.',
                  offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'USD',
                  },
                  publisher: { '@id': 'https://rsxjs.com/#organization' },
                },
                {
                  '@type': 'WebSite',
                  '@id': 'https://rsxjs.com/#website',
                  url: 'https://rsxjs.com',
                  name: 'rs-x',
                  publisher: { '@id': 'https://rsxjs.com/#organization' },
                },
              ],
            }),
          }}
        />
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
