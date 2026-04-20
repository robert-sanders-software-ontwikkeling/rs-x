<script setup lang="ts">
import { computed } from 'vue';

import { useRsxExpression } from '@rs-x/vue';

import type { RowView } from '../lib/virtual-table-controller';

const props = defineProps<{ item: RowView }>();

const style = computed(() => ({
  transform: `translateY(${props.item.top}px)`,
}));

const id = useRsxExpression(props.item.row.idExpr);
const name = useRsxExpression(props.item.row.nameExpr);
const category = useRsxExpression(props.item.row.categoryExpr);
const price = useRsxExpression(props.item.row.priceExpr);
const quantity = useRsxExpression(props.item.row.quantityExpr);
const total = useRsxExpression(props.item.row.totalExpr);
const updatedAt = useRsxExpression(props.item.row.updatedAtExpr);
</script>

<template>
  <div class="table-row" :style="style">
    <span data-label="ID">#{{ id ?? 0 }}</span>
    <span data-label="Name">{{ name ?? '' }}</span>
    <span data-label="Category">{{ category ?? '' }}</span>
    <span data-label="Price">€{{ price ?? 0 }}</span>
    <span data-label="Qty">{{ quantity ?? 0 }}</span>
    <span data-label="Total" class="total">€{{ total ?? 0 }}</span>
    <span data-label="Updated">{{ updatedAt ?? '--' }}</span>
  </div>
</template>
