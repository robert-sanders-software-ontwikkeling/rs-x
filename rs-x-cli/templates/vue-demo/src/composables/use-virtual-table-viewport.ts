import { getCurrentScope, onMounted, onScopeDispose, type Ref } from 'vue';

import type { VirtualTableController } from '../lib/virtual-table-controller';

const COMPACT_BREAKPOINT_PX = 720;
const DEFAULT_ROW_HEIGHT = 36;
const COMPACT_ROW_HEIGHT = 168;

export function useVirtualTableViewport(
  controller: VirtualTableController,
  viewportRef: Ref<HTMLDivElement | null>,
): void {
  let observer: ResizeObserver | undefined;

  onMounted(() => {
    const viewport = viewportRef.value;
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
    observer = new ResizeObserver(syncMetrics);
    observer.observe(viewport);
  });

  if (getCurrentScope()) {
    onScopeDispose(() => {
      observer?.disconnect();
    });
  }
}
