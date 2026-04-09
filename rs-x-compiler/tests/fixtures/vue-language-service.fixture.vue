<script setup lang="ts">
import { rsx } from '@rs-x/expression-parser';

import type { Model } from './vue-language-service-model';

const model: Model = {
  user: {
    name: 'Alice',
    age: 42,
  },
};

const userNameExpr = rsx('user.name')(model);
const invalidExpr = rsx('user.missing')(model);
</script>

<template>
  <main>
    <p>{{ userNameExpr }}</p>
    <p>{{ invalidExpr }}</p>
  </main>
</template>
