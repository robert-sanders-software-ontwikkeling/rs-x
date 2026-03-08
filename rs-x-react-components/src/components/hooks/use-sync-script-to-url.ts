'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function useSyncScriptToUrl(args: {
  script: string;
  buildQuery: (script: string) => string;
  debounceMs?: number;
  enabled?: boolean;
}): void {
  const { script, buildQuery } = args;
  const debounceMs = args.debounceMs ?? 500;
  const enabled = args.enabled ?? true;

  const router = useRouter();
  const lastQueryRef = useRef<string>('');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const nextQuery = buildQuery(script);

    // no change → do nothing
    if (nextQuery === lastQueryRef.current) {
      return;
    }

    // debounce
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      lastQueryRef.current = nextQuery;
      router.replace(`?${nextQuery}`);
    }, debounceMs);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [router, script, buildQuery, debounceMs, enabled]);
}
