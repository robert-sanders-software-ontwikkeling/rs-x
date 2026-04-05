import dedent from 'dedent';
import type { Metadata } from 'next';

import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../../core-concepts/_template/core-concept-page';

const installCode = dedent`
  npm install @rs-x/core @rs-x/state-manager @rs-x/expression-parser @rs-x/vue
`;

const vueBasicCode = dedent`
  import { reactive } from 'vue';
  import { rsx } from '@rs-x/expression-parser';
  import { useRsxExpression } from '@rs-x/vue';

  const model = reactive({
    price: 100,
    quantity: 2,
  });

  const totalExpr = rsx<number>('price * quantity')(model);
  const total = useRsxExpression(totalExpr);

  model.quantity = 3; // Vue updates when total.value changes
`;

const vueComposableCode = dedent`
  import { getCurrentScope, onScopeDispose, shallowRef } from 'vue';
  import { AbstractExpression, type IExpression } from '@rs-x/expression-parser';

  export function useRsxExpression<T>(expression: IExpression<T>) {
    if (!(expression instanceof AbstractExpression)) {
      throw new Error('useRsxExpression: expression must be an IExpression');
    }

    const expr = expression;

    const value = shallowRef<T | null>(expr.value ?? null);
    const subscription = expr.changed.subscribe(() => {
      value.value = expr.value ?? null;
    });

    if (getCurrentScope()) {
      onScopeDispose(() => {
        subscription.unsubscribe();
      });
    }

    return value;
  }
`;

const vueComposableUsageCode = dedent`
  import { reactive } from 'vue';
  import { rsx } from '@rs-x/expression-parser';
  import { useRsxExpression } from '@rs-x/vue';

  const model = reactive({ price: 100, quantity: 2 });
  const totalExpr = rsx<number>('price * quantity')(model);

  const total = useRsxExpression(totalExpr);
`;

const vueComponentCode = dedent`
  <script setup lang="ts">
  import { reactive } from 'vue';
  import { rsx } from '@rs-x/expression-parser';
  import { useRsxExpression } from '@rs-x/vue';

  const model = reactive({
    price: 100,
    quantity: 2,
  });

  const totalExpr = rsx<number>('price * quantity')(model);
  const total = useRsxExpression(totalExpr);

  function bump() {
    model.quantity += 1;
  }
  </script>

  <template>
    <div>
      <p>Price: {{ model.price }}</p>
      <p>Quantity: {{ model.quantity }}</p>
      <p>Total: {{ total }}</p>

      <button @click="bump">Add one</button>
    </div>
  </template>
`;

const vueLeafWatchRuleCode = dedent`
  import { computed, reactive } from 'vue';
  import { rsx } from '@rs-x/expression-parser';
  import type { IIndexWatchRule } from '@rs-x/state-manager';

  const model = reactive({
    items: ['apple', 'banana', 'cherry'],
  });

  const watchFirstOnly: IIndexWatchRule = {
    id: 'first-index-only',
    context: null,
    test(index, target) {
      return Array.isArray(target) && index === 0;
    },
    dispose() {},
  };

  const listExpr = rsx<string[]>('items', { leafWatchRule: watchFirstOnly })(model);

  const firstItem = computed(() => listExpr.value?.[0]);
`;

const doc: CoreConceptDoc = {
  title: 'Vue integration',
  lead: 'Use the @rs-x/vue composable to bind expressions directly to Vue components — no manual subscriptions required.',
  whatItMeans:
    'The @rs-x/vue package provides a useRsxExpression composable. It accepts an rs-x expression, subscribes to its change events, and exposes the live value as a Vue ref.',
  whyItMatters:
    'You keep Vue components declarative while rs-x handles fine-grained dependency tracking. Vue updates automatically whenever the expression value changes.',
  keyPoints: [
    'useRsxExpression accepts a pre-built IExpression from rsx(...).',
    'Subscriptions are disposed automatically when the component scope is destroyed.',
    'Use rsx(..., { leafWatchRule })(model) to narrow which array or map entries trigger updates.',
  ],
  examples: [
    {
      title: 'Single-file component example',
      description:
        'Full Vue component with a reactive model and an rs-x expression bound via useRsxExpression.',
      code: vueComponentCode,
    },
    {
      title: 'Basic usage',
      description:
        'Create an expression with rsx(...) and pass it to the composable.',
      code: vueBasicCode,
    },
    {
      title: 'Composable implementation',
      description: 'The implementation inside @rs-x/vue (shown for reference).',
      code: vueComposableCode,
    },
    {
      title: 'Pre-built expression',
      description: 'Pass a pre-built IExpression to avoid recreating it.',
      code: vueComposableUsageCode,
    },
    {
      title: 'Leaf watch rule',
      description:
        'Track only specific indices in a collection to avoid unnecessary updates.',
      code: vueLeafWatchRuleCode,
    },
    {
      title: 'Installation',
      description: 'Install the core runtime packages.',
      code: installCode,
    },
  ],
  related: [
    {
      href: 'https://vuejs.org',
      title: 'Vue official website',
      meta: 'Docs, guides, and Vue ecosystem',
    },
    {
      href: '/docs',
      title: 'Docs overview',
      meta: 'Core concepts and API reference',
    },
    {
      href: '/docs/core-concepts/first-expression',
      title: 'First expression',
      meta: 'Bind expressions and subscribe to changes',
    },
    {
      href: '/docs/core-concepts/cli',
      title: 'CLI',
      meta: 'Install, setup, build, and typecheck workflows',
    },
    {
      href: '/docs/core-concepts/compiler',
      title: 'Compiler',
      meta: 'Build-time parsing, validation, and compiled expressions',
    },
    {
      href: '/docs/core-concepts/batching-transactions',
      title: 'Batching transactions',
      meta: 'Group updates and emit once',
    },
    {
      href: '/docs/core-concepts/performance',
      title: 'Performance',
      meta: 'Parsing, binding, update costs, and memory',
    },
  ],
};

export const metadata: Metadata = {
  title: doc.title,
  description: doc.lead,
};

const headerNote = (
  <div className="docsApiActions" style={{ marginTop: '1rem' }}>
    <a className="btn btnPrimary" href="/get-started?track=vue">
      Vue setup <span aria-hidden="true">→</span>
    </a>
  </div>
);

export default function Page() {
  return <CoreConceptPageLayout doc={doc} headerNote={headerNote} />;
}
