'use client';

import { useRef, useSyncExternalStore } from 'react';

import {
  VirtualTableController,
  type VirtualTableSnapshot,
} from '@/lib/virtual-table-controller';

export function useVirtualTableController(): {
  controller: VirtualTableController;
  snapshot: VirtualTableSnapshot;
} {
  const controllerRef = useRef<VirtualTableController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new VirtualTableController();
  }
  const controller = controllerRef.current;
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  return { controller, snapshot };
}
