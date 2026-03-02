'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function useSyncScriptToUrl(args: {
  script: string;
  buildQuery: (script: string) => string;
  debounceMs?: number;
}): void {
  const { script, buildQuery } = args;
  const debounceMs = args.debounceMs ?? 500;

  const router = useRouter();
  const lastQueryRef = useRef<string>('');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
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
  }, [router, script, buildQuery, debounceMs]);
}
