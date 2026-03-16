'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

const CURRENT_ROUTE_KEY = 'rsx.nav.current';
const PREVIOUS_ROUTE_KEY = 'rsx.nav.previous';
const SCROLL_POSITIONS_KEY = 'rsx.nav.scrollPositions';

function buildCurrentRoute(pathname: string, search: string): string {
  return search ? `${pathname}?${search}` : pathname;
}

function readScrollPositions(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(SCROLL_POSITIONS_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, number>;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

function writeScrollPosition(route: string, value: number) {
  const positions = readScrollPositions();
  positions[route] = Math.max(0, Math.floor(value));
  sessionStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(positions));
}

export function NavigationHistoryTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? '';
  const routeRef = useRef<string | null>(null);
  const lastScrollYRef = useRef(0);
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const route = buildCurrentRoute(pathname, search);
    const previousRoute =
      routeRef.current ?? sessionStorage.getItem(CURRENT_ROUTE_KEY);

    if (previousRoute && previousRoute !== route) {
      writeScrollPosition(previousRoute, lastScrollYRef.current);
      sessionStorage.setItem(PREVIOUS_ROUTE_KEY, previousRoute);
    }

    routeRef.current = route;
    isNavigatingRef.current = false;
    sessionStorage.setItem(CURRENT_ROUTE_KEY, route);

    const positions = readScrollPositions();
    const nextY = positions[route] ?? 0;
    let attempts = 0;
    const maxAttempts = 40;
    let timer = 0;
    let cancelled = false;

    const restore = () => {
      if (cancelled) {
        return;
      }

      const maxScrollableY = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const canReachTarget = maxScrollableY >= nextY;
      const targetY = canReachTarget ? nextY : maxScrollableY;

      window.scrollTo({ top: targetY, behavior: 'auto' });
      lastScrollYRef.current = window.scrollY;
      attempts += 1;

      const reachedTarget = Math.abs(window.scrollY - nextY) <= 2;
      if (attempts < maxAttempts && (!canReachTarget || !reachedTarget)) {
        timer = window.setTimeout(restore, 50);
      }
    };

    requestAnimationFrame(restore);

    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [pathname, search]);

  useEffect(() => {
    let frame = 0;

    const persistCurrentRoute = () => {
      const route = routeRef.current;
      if (!route) {
        return;
      }
      writeScrollPosition(route, lastScrollYRef.current);
    };

    const onScroll = () => {
      if (isNavigatingRef.current) {
        return;
      }
      lastScrollYRef.current = window.scrollY;
      if (frame) {
        return;
      }
      frame = window.requestAnimationFrame(() => {
        persistCurrentRoute();
        frame = 0;
      });
    };

    const onPopState = () => {
      persistCurrentRoute();
      isNavigatingRef.current = true;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('beforeunload', persistCurrentRoute);
    window.addEventListener('pagehide', persistCurrentRoute);
    window.addEventListener('popstate', onPopState);

    const onDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as Element | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) {
        return;
      }

      let nextUrl: URL;
      try {
        nextUrl = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (nextUrl.origin !== window.location.origin) {
        return;
      }

      const currentRoute = `${window.location.pathname}${window.location.search}`;
      const nextRoute = `${nextUrl.pathname}${nextUrl.search}`;
      if (nextRoute === currentRoute) {
        return;
      }

      persistCurrentRoute();
      isNavigatingRef.current = true;
    };

    document.addEventListener('click', onDocumentClick, true);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('beforeunload', persistCurrentRoute);
      window.removeEventListener('pagehide', persistCurrentRoute);
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onDocumentClick, true);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      persistCurrentRoute();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.history.scrollRestoration) {
      return;
    }

    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  return null;
}

export { CURRENT_ROUTE_KEY, PREVIOUS_ROUTE_KEY };
