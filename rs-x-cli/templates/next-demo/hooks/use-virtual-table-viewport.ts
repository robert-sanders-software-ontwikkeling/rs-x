'use client';

import { type RefObject, useEffect, useRef } from 'react';

import type { VirtualTableController } from '@/lib/virtual-table-controller';

const COMPACT_BREAKPOINT_PX = 720;
const DEFAULT_ROW_HEIGHT = 36;
const COMPACT_ROW_HEIGHT = 168;

export function useVirtualTableViewport(
  controller: VirtualTableController,
): RefObject<HTMLDivElement | null> {
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const syncMetrics = (): void => {
      controller.setViewportHeight(viewport.clientHeight);
      controller.setRowHeight(
        viewport.clientWidth <= COMPACT_BREAKPOINT_PX
          ? COMPACT_ROW_HEIGHT
          : DEFAULT_ROW_HEIGHT,
      );
    };

    syncMetrics();
    const observer = new ResizeObserver(syncMetrics);
    observer.observe(viewport);

    return () => {
      observer.disconnect();
    };
  }, [controller]);

  return viewportRef;
}
