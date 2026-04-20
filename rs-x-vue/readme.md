# @rs-x/vue

Vue composables for RS-X expressions.

## Install

```bash
npm install @rs-x/core @rs-x/state-manager @rs-x/expression-parser @rs-x/vue
```

## Usage

```ts
import { reactive } from 'vue';
import { rsx } from '@rs-x/expression-parser';
import { useRsxExpression } from '@rs-x/vue';

const model = reactive({ price: 100, quantity: 2 });
const totalExpr = rsx<number>('price * quantity')(model);
const total = useRsxExpression(totalExpr);
```
