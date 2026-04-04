<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';

import { useVirtualTableController } from '../composables/use-virtual-table-controller';
import { useVirtualTableViewport } from '../composables/use-virtual-table-viewport';
import VirtualTableRow from './VirtualTableRow.vue';

const { controller, snapshot } = useVirtualTableController();
const viewport = useTemplateRef<HTMLDivElement>('viewport');
useVirtualTableViewport(controller, viewport);

const visibleRows = computed(() => snapshot.value.visibleRows);
</script>

<template>
  <section class="table-toolbar">
    <div class="toolbar-left">
      <h2>Inventory Snapshot</h2>
      <p>{{ snapshot.totalRows }} rows • {{ snapshot.poolSize }} pre-wired models</p>
    </div>
    <div class="toolbar-right">
      <button type="button" @click="controller.toggleSort('price')">Sort by price</button>
      <button type="button" @click="controller.toggleSort('quantity')">Sort by stock</button>
      <button type="button" @click="controller.toggleSort('name')">Sort by name</button>
    </div>
  </section>

  <div class="table-header">
    <span>ID</span>
    <span>Name</span>
    <span>Category</span>
    <span>Price</span>
    <span>Qty</span>
    <span>Total</span>
    <span>Updated</span>
  </div>

  <div
    ref="viewport"
    class="table-viewport"
    @scroll="controller.setScrollTop(($event.target as HTMLDivElement).scrollTop)"
  >
    <div class="table-spacer" :style="{ height: `${snapshot.spacerHeight}px` }" />
    <VirtualTableRow
      v-for="item in visibleRows"
      :key="item.index"
      :item="item"
    />
  </div>

  <div class="table-footer">
    <div>
      Rows in view: {{ snapshot.rowsInView }} • Loaded pages:
      {{ snapshot.loadedPageCount }}
    </div>
    <div>Scroll to stream pages from a 1,000,000-row virtual dataset.</div>
  </div>
</template>
