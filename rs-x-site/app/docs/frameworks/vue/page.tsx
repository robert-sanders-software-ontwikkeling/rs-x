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
  import { useRsxExpression } from '@rs-x/vue';

  const model = reactive({
    price: 100,
    quantity: 2,
  });

  const total = useRsxExpression<number>('price * quantity', { model });

  model.quantity = 3; // Vue updates when total.value changes
`;

const vueComposableCode = dedent`
  import { getCurrentScope, onScopeDispose, shallowRef } from 'vue';
  import { ArgumentException, Type } from '@rs-x/core';
  import { AbstractExpression, type IExpression } from '@rs-x/expression-parser';
  import { getExpressionFactory } from '@rs-x/vue';
  import type { IIndexWatchRule } from '@rs-x/state-manager';

  export function useRsxExpression<T>(
    expression: string | IExpression<T>,
    options?: { model?: object; leafWatchRule?: IIndexWatchRule },
  ) {
    const { model, leafWatchRule } = options || {};
    if (Type.isString(expression) && !model) {
      throw new ArgumentException('model is required when expression is a string');
    }

    let expr: IExpression<T>;
    let ownsExpression = false;

    if (Type.isString(expression)) {
      expr = getExpressionFactory().create<T>(model as object, expression, leafWatchRule);
      ownsExpression = true;
    } else if (expression instanceof AbstractExpression) {
      expr = expression;
    } else {
      throw new Error('useRsxExpression: expression must be a string or an IExpression');
    }

    const value = shallowRef<T | null>(expr.value ?? null);
    const subscription = expr.changed.subscribe(() => {
      value.value = expr.value ?? null;
    });

    if (getCurrentScope()) {
      onScopeDispose(() => {
        subscription.unsubscribe();
        if (ownsExpression) {
          expr.dispose();
        }
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
  import { useRsxExpression } from '@rs-x/vue';

  const model = reactive({
    price: 100,
    quantity: 2,
  });

  const total = useRsxExpression<number>('price * quantity', { model });

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
    'The @rs-x/vue package provides a useRsxExpression composable. It creates (or accepts) an rs-x expression, subscribes to its change events, and exposes the live value as a Vue ref.',
  whyItMatters:
    'You keep Vue components declarative while rs-x handles fine-grained dependency tracking. Vue updates automatically whenever the expression value changes.',
  keyPoints: [
    'useRsxExpression accepts a string (with model) or a pre-built IExpression.',
    'Subscriptions are disposed automatically when the component scope is destroyed.',
    'Use leafWatchRule to narrow which array or map entries trigger updates.',
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
        'Pass a model and expression string. The composable returns a ref with the live value.',
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
      href: '/docs/frameworks/react',
      title: 'React integration',
      meta: 'Hooks for expression binding and model subscriptions',
    },
    {
      href: '/docs/frameworks/angular',
      title: 'Angular integration',
      meta: 'RsxPipe for template bindings',
    },
    {
      href: '/docs/core-concepts/member-expressions',
      title: 'Member expressions',
      meta: 'Nested access and indexed member tracking',
    },
    {
      href: '/docs/collections',
      title: 'Collections',
      meta: 'Array/Map/Set tracking patterns',
    },
  ],
};

export const metadata: Metadata = {
  title: doc.title,
  description: doc.lead,
};

export default function Page() {
  return <CoreConceptPageLayout doc={doc} />;
}
