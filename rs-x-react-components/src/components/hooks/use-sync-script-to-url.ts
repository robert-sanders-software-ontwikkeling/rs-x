'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function useSyncScriptToUrl(args: {
  script: string;
  buildQuery: (script: string) => string | Promise<string>;
  debounceMs?: number;
  enabled?: boolean;
}): void {
  const { script, buildQuery } = args;
  const debounceMs = args.debounceMs ?? 500;
  const enabled = args.enabled ?? true;

  const router = useRouter();
  const lastQueryRef = useRef<string>('');
  const timerRef = useRef<number | null>(null);
  const writeSeqRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    const writeSeq = writeSeqRef.current + 1;
    writeSeqRef.current = writeSeq;

    timerRef.current = window.setTimeout(() => {
      void (async () => {
        const nextQuery = await buildQuery(script);
        if (writeSeq !== writeSeqRef.current) {
          return;
        }

        // no change -> do nothing
        if (nextQuery === lastQueryRef.current) {
          return;
        }

        lastQueryRef.current = nextQuery;
        router.replace(`?${nextQuery}`);
      })();
    }, debounceMs);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [router, script, buildQuery, debounceMs, enabled]);
}
