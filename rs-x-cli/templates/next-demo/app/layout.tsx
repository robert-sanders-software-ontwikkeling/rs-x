import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'RS-X Next.js Demo',
  description:
    'Million-row virtual scrolling with a fixed RS-X expression pool in Next.js.',
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" data-theme="dark">
      <body data-theme="dark">{children}</body>
    </html>
  );
}
