'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PREVIOUS_ROUTE_KEY } from './NavigationHistoryTracker';

type SmartBackLinkProps = {
  className?: string;
};

function toLabel(route: string): string {
  const path = route.split('?')[0];

  if (path === '/') return 'Home';
  if (path === '/docs') return 'Docs';
  if (path === '/docs/core-api') return '@rs-x/core API';
  if (path === '/docs/api') return 'API reference';
  if (path === '/advanced') return 'Advanced';
  if (path === '/features') return 'Features';
  if (path === '/get-started') return 'Get started';
  if (path === '/playground') return 'Playground';

  if (path.startsWith('/docs/core-api/module/')) {
    const modulePart = decodeURIComponent(
      path.slice('/docs/core-api/module/'.length),
    );
    return modulePart;
  }

  if (path.startsWith('/docs/api/')) {
    const pkg = decodeURIComponent(path.slice('/docs/api/'.length));
    if (pkg === 'core') return '@rs-x/core API';
    if (pkg === 'state-manager') return '@rs-x/state-manager API';
    if (pkg === 'expression-parser') return '@rs-x/expression-parser API';
  }

  const segment = decodeURIComponent(
    path.split('/').filter(Boolean).at(-1) ?? 'Page',
  );
  if (!segment) {
    return 'Page';
  }

  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSameOriginReferrerRoute(currentRoute: string): string | null {
  if (typeof document === 'undefined' || !document.referrer) {
    return null;
  }

  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin !== window.location.origin) {
      return null;
    }

    const referrerRoute = `${referrer.pathname}${referrer.search}`;
    if (referrerRoute === currentRoute) {
      return null;
    }

    return referrerRoute;
  } catch {
    return null;
  }
}

export function SmartBackLink({
  className = 'btn btnGhost',
}: SmartBackLinkProps) {
  const pathname = usePathname();
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    if (!pathname) {
      setHref(null);
      return;
    }

    const currentRoute = `${pathname}${window.location.search}`;
    const fromStorage = sessionStorage.getItem(PREVIOUS_ROUTE_KEY);
    if (fromStorage && fromStorage !== currentRoute) {
      setHref(fromStorage);
      return;
    }

    const fromReferrer = getSameOriginReferrerRoute(currentRoute);
    setHref(fromReferrer);
  }, [pathname]);

  if (!href) {
    return null;
  }

  return (
    <Link className={className} href={href} scroll={false}>
      Back to {toLabel(href)} <span aria-hidden="true">→</span>
    </Link>
  );
}
