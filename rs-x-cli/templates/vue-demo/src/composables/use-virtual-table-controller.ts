import {
  getCurrentScope,
  onScopeDispose,
  shallowRef,
  type ShallowRef,
} from 'vue';

import {
  VirtualTableController,
  type VirtualTableSnapshot,
} from '../lib/virtual-table-controller';

export function useVirtualTableController(): {
  controller: VirtualTableController;
  snapshot: ShallowRef<VirtualTableSnapshot>;
} {
  const controller = new VirtualTableController();
  const snapshot = shallowRef(controller.getSnapshot());
  const unsubscribe = controller.subscribe(() => {
    snapshot.value = controller.getSnapshot();
  });

  if (getCurrentScope()) {
    onScopeDispose(() => {
      unsubscribe();
    });
  }

  return {
    controller,
    snapshot,
  };
}
