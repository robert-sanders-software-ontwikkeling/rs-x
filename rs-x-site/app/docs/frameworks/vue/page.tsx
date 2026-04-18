import dedent from 'dedent';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SyntaxCodeBlock } from '../../../../components/SyntaxCodeBlock';

import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../../core-concepts/_template/core-concept-page';
import { VueCompiledFrameworkExample } from './vue-runtime-lab.client';

const installCode = dedent`
  rsx init
`;

const vueComposableUsageCode = dedent`
  import { rsx } from '@rs-x/expression-parser';
  import { useRsxExpression, useRsxModel } from '@rs-x/vue';

  // Create a module-scoped model and expression once
  const model = {
    price: 100,
    quantity: 3,
  };
  const totalExpr = rsx<number>('price * quantity')(model);

  export default {
    name: 'OrderTotal',
    setup() {
      useRsxModel(model);
      const total = useRsxExpression(totalExpr);

      return {
        model,
        total,
      };
    },
    template: \`
      <div>
        <label>
          Price
          <input
            :value="model.price"
            type="number"
            @input="model.price = Number($event.target.value)"
          />
        </label>
        <label>
          Quantity
          <input
            :value="model.quantity"
            type="number"
            @input="model.quantity = Number($event.target.value)"
          />
        </label>
        <dl>
          <div class="metricRow">
            <dt>Total</dt>
            <dd class="metricValue">{{ total }}</dd>
          </div>
        </dl>
      </div>
    \`,
  };

  export function dispose() {
    totalExpr.dispose();
  }
`;

const vueUseMemoEquivalentCode = dedent`
  import { rsx } from '@rs-x/expression-parser';
  import { useRsxExpression, useRsxModel } from '@rs-x/vue';

  export default {
    name: 'OrderTotal',
    setup() {
      const model = {
        price: 100,
        quantity: 3,
      };
      useRsxModel(model);
      const totalExpr = rsx<number>('price * quantity')(model);
      const total = useRsxExpression(totalExpr);

      return {
        model,
        total,
      };
    },
    template: \`
      <div>
        <label>
          Price
          <input
            :value="model.price"
            type="number"
            @input="model.price = Number($event.target.value)"
          />
        </label>
        <label>
          Quantity
          <input
            :value="model.quantity"
            type="number"
            @input="model.quantity = Number($event.target.value)"
          />
        </label>
        <dl>
          <div class="metricRow">
            <dt>Total</dt>
            <dd class="metricValue">{{ total }}</dd>
          </div>
        </dl>
      </div>
    \`,
  };
`;

const vueComponentCode = dedent`
  <script setup lang="ts">
  import { useRsxModel } from '@rs-x/vue';

  const model = {
    price: 100,
    quantity: 2,
  };
  useRsxModel(model);

  function bump() {
    model.quantity += 1;
  }
  </script>

  <template>
    <div>
      <p>Price: {{ model.price }}</p>
      <p>Quantity: {{ model.quantity }}</p>
      <p>Total: {{ model.price * model.quantity }}</p>

      <button @click="bump">Add one</button>
    </div>
  </template>
`;

const vueLeafWatchRuleCode = dedent`
  import { computed } from 'vue';
  import { rsx } from '@rs-x/expression-parser';
  import type { IIndexWatchRule } from '@rs-x/state-manager';

  const model = {
    items: ['apple', 'banana', 'cherry'],
  };

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

const vueTransactionCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import { rsx, RsXExpressionParserInjectionTokens } from '@rs-x/expression-parser';
  import { useRsxModel } from '@rs-x/vue';

  const orderModel = {
    price: 100,
    quantity: 2,
  };

  const statsModel = {
    commits: 0,
    expected: 0,
    lastMode: 'none',
    running: false,
  };

  const totalExpr = rsx<number>('price * quantity')(orderModel);

  const commitSubscription = totalExpr.changed.subscribe(() => {
    statsModel.commits += 1;
  });

  const tx = InjectionContainer.get<{
    suspend(): void;
    continue(): void;
  }>(
    RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager,
  );

  async function runWithoutTransaction() {
    statsModel.commits = 0;
    statsModel.expected = 2;
    statsModel.lastMode = 'Async updates';
    statsModel.running = true;
    orderModel.price += 10;
    await Promise.resolve();
    orderModel.quantity += 1;
    statsModel.running = false;
  }

  async function runWithTransaction() {
    statsModel.commits = 0;
    statsModel.expected = 1;
    statsModel.lastMode = 'Transaction';
    statsModel.running = true;
    tx.suspend();
    orderModel.price += 10;
    await Promise.resolve();
    orderModel.quantity += 1;
    tx.continue();
    statsModel.running = false;
  }

  export default {
    name: 'TransactionExample',
    setup() {
      const state = {
        order: orderModel,
        stats: statsModel,
      };
      useRsxModel(state);

      return {
        state,
        runWithoutTransaction,
        runWithTransaction,
      };
    },
    template: \`
      <div>
        <h3 class="previewSectionTitle">Measured values</h3>
        <dl>
          <div class="metricRow">
            <dt>Price</dt>
            <dd class="metricValue">{{ state.order.price }}</dd>
          </div>
          <div class="metricRow">
            <dt>Quantity</dt>
            <dd class="metricValue">{{ state.order.quantity }}</dd>
          </div>
          <div class="metricRow">
            <dt>Total</dt>
            <dd class="metricValue">{{ state.order.price * state.order.quantity }}</dd>
          </div>
          <div class="metricRow">
            <dt>Last action emit count</dt>
            <dd class="metricValue">{{ state.stats.commits }}</dd>
          </div>
          <div class="metricRow">
            <dt>Expected emit count</dt>
            <dd class="metricValue">{{ state.stats.expected }}</dd>
          </div>
          <div class="metricRow metricRowResult">
            <dt>Result</dt>
            <dd :class="state.stats.lastMode !== 'none' ? 'metricText' : 'metricText metricTextReserved'">
              {{
                state.stats.lastMode === 'none'
                  ? ' '
                  : state.stats.commits === state.stats.expected
                  ? 'Verified: ' + state.stats.lastMode + ' emitted ' + state.stats.commits + ' time(s).'
                  : 'Unexpected: ' + state.stats.lastMode + ' emitted ' + state.stats.commits + ' time(s), expected ' + state.stats.expected + '.'
              }}
            </dd>
          </div>
        </dl>

        <h3 class="previewSectionTitle">How to read this</h3>
        <p class="previewNote">
          Both buttons apply the same two updates: increase price by 10 and quantity by 1.
        </p>
        <p class="previewNote">
          The difference is timing: the first button splits them into two async
          steps, while the transaction keeps those async steps batched until the
          end.
        </p>

        <h3 class="previewSectionTitle">Try it</h3>
        <div class="previewActions">
          <button :disabled="state.stats.running" @click="runWithoutTransaction">
            Run async updates without transaction
          </button>
          <button :disabled="state.stats.running" @click="runWithTransaction">
            Run async updates with transaction
          </button>
        </div>
      </div>
    \`,
  };

  export function dispose() {
    commitSubscription.unsubscribe();
    totalExpr.dispose();
  }
`;

const doc: CoreConceptDoc = {
  title: 'Vue integration',
  lead: 'Use the @rs-x/vue composable to bind expressions directly to Vue components — no manual subscriptions required.',
  whatItMeans:
    'The @rs-x/vue package provides useRsxExpression for pre-built expressions and useRsxModel when you want to bind model fields with less boilerplate.',
  whyItMatters:
    'You keep Vue components declarative while rs-x handles fine-grained dependency tracking. Vue updates automatically whenever the expression value changes.',
  keyPoints: [
    'useRsxExpression accepts a pre-built IExpression from rsx(...).',
    'useRsxModel wires Vue into your existing rs-x model so the template stays in sync as that model changes.',
    'Your rs-x model can be a plain object. You do not need to wrap it in Vue reactive(...) just to make rs-x updates work.',
    'Subscriptions are disposed automatically when the component scope is destroyed.',
    'Use rsx(..., { leafWatchRule })(model) to narrow which array or map entries trigger updates.',
  ],
  examples: [
    {
      title: 'useRsxExpression — pre-built IExpression',
      description:
        'Create the expression first and pass that same expression instance to the Vue composable. You can combine this with useRsxModel when you also want direct field bindings.',
      code: vueComposableUsageCode,
    },
    {
      title: 'useRsxModel — component-owned model',
      description:
        'Use useRsxModel(model) when you want Vue to keep the template in sync with an rs-x model. Define the model, call useRsxModel(model) once in setup(), and keep binding that same model in the template.',
      code: vueUseMemoEquivalentCode,
    },
    {
      title: 'Expression change transactions',
      description:
        'Use the transaction manager when async multi-step updates should publish one final change instead of intermediate values.',
      code: vueTransactionCode,
    },
    {
      title: 'Vue single-file component example',
      description:
        'A complete Vue single-file component example with a plain object model bound through useRsxModel.',
      code: vueComponentCode,
    },
    {
      title: 'Leaf watch rule',
      description:
        'Track only specific indices in a collection to avoid unnecessary updates.',
      code: vueLeafWatchRuleCode,
    },
    {
      title: 'Installation',
      description: (
        <>
          Run <code>rsx init</code> in your Vue project to detect the
          framework, install the right packages, and apply the setup
          automatically. See the <Link href="/docs/core-concepts/cli">CLI docs</Link>.
        </>
      ),
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
  alternates: {
    canonical: '/docs/frameworks/vue',
  },
};

const headerNote = (
  <div className="docsApiActions" style={{ marginTop: '1rem' }}>
    <a className="btn btnPrimary" href="/get-started?track=vue">
      Vue setup <span aria-hidden="true">→</span>
    </a>
  </div>
);

export default function Page() {
  return (
    <CoreConceptPageLayout
      doc={doc}
      headerNote={headerNote}
      examplesSlot={
        <>
          <article className="card docsApiCard">
            <h2 className="cardTitle">useRsxExpression — pre-built IExpression example</h2>
            <p className="cardText">
              Build the expression once at module scope and reuse it. The Vue
              composable subscribes to those pre-built expressions and keeps the
              displayed values in sync while the inputs mutate the shared model.
            </p>
            <VueCompiledFrameworkExample
              initialCode={vueComposableUsageCode}
              editorId="vue-expression-prebuilt"
            />
          </article>
          <article className="card docsApiCard">
            <h2 className="cardTitle">useRsxModel — component-owned model example</h2>
            <p className="cardText">
              Use <code>useRsxModel(model)</code> when you want Vue to keep the
              template in sync with an rs-x model. Define the model, call the
              hook once in <code>setup()</code>, and keep binding that same{' '}
              <code>model</code> in the template.
            </p>
            <VueCompiledFrameworkExample
              initialCode={vueUseMemoEquivalentCode}
              editorId="vue-expression-component-owned"
            />
          </article>
          <article className="card docsApiCard">
            <h2 className="cardTitle">Expression change transactions example</h2>
            <p className="cardText">
              Run the same two async updates with and without a transaction and
              compare the emitted updates.
            </p>
            <VueCompiledFrameworkExample
              initialCode={vueTransactionCode}
              editorId="vue-expression-transactions"
            />
          </article>
          <article className="card docsApiCard">
            <h2 className="cardTitle">Vue single-file component example</h2>
            <p className="cardText">
              A complete Vue single-file component example with a plain object
              model bound through <code>useRsxModel</code>.
            </p>
            <SyntaxCodeBlock code={vueComponentCode} />
          </article>
          <article className="card docsApiCard">
            <h2 className="cardTitle">Leaf watch rule example</h2>
            <p className="cardText">
              Track only specific indices in a collection to avoid unnecessary
              updates.
            </p>
            <SyntaxCodeBlock code={vueLeafWatchRuleCode} />
          </article>
          <article className="card docsApiCard">
            <h2 className="cardTitle">Installation example</h2>
            <p className="cardText">
              Run rsx init in your Vue project to install the right packages
              and apply the setup automatically. See the{' '}
              <Link href="/docs/core-concepts/cli">CLI docs</Link>.
            </p>
            <SyntaxCodeBlock code={installCode} />
          </article>
        </>
      }
    />
  );
}
