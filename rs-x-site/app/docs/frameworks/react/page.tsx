import dedent from 'dedent';
import type { Metadata } from 'next';
import Link from 'next/link';

import { EditableCompiledFrameworkExample } from '@rs-x/react-components';
import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../../core-concepts/_template/core-concept-page';
import { SyntaxCodeBlock } from '../../../../components/SyntaxCodeBlock';

const demoLinks = (
  <div className="docsApiActions" style={{ marginTop: '1rem' }}>
    <a className="btn btnPrimary" href="/get-started?track=react">
      React setup <span aria-hidden="true">→</span>
    </a>
    <a
      className="btn btnGhost"
      href="https://github.com/robert-sanders-software-ontwikkeling/rs-x-react-demo"
      target="_blank"
      rel="noopener noreferrer"
    >
      View on GitHub <span aria-hidden="true">↗</span>
    </a>
  </div>
);

const installCode = dedent`
  rsx init
`;

const useRsxExpressionSharedCode = dedent`
  import { rsx } from '@rs-x/expression-parser';
  import { useRsxExpression } from '@rs-x/react';

  // Create a module-scoped model and expression once
  const model = { price: 100, quantity: 3 };
  const totalExpr = rsx<number>('price * quantity')(model);

  export default function OrderTotal() {
    // Pass the pre-built IExpression — no model needed
    const total = useRsxExpression(totalExpr);

    return (
      <div>
        <label>
          Price
          <input
            type="number"
            value={model.price}
            onChange={(event) => {
              model.price = Number(event.target.value);
            }}
          />
        </label>
        <label>
          Quantity
          <input
            type="number"
            value={model.quantity}
            onChange={(event) => {
              model.quantity = Number(event.target.value);
            }}
          />
        </label>
        <span>Total: {total}</span>
      </div>
    );
  }

  export function dispose() {
    totalExpr.dispose();
  }
`;

const useRsxExpressionUseMemoCode = dedent`
  import { useMemo } from 'react';
  import { rsx } from '@rs-x/expression-parser';
  import { useRsxExpression } from '@rs-x/react';

  export default function OrderTotal() {
    const model = useMemo(() => ({ price: 100, quantity: 3 }), []);
    const total = useRsxExpression(
      () => rsx<number>('price * quantity')(model),
    );

    return (
      <div>
        <label>
          Price
          <input
            type="number"
            value={model.price}
            onChange={(event) => {
              model.price = Number(event.target.value);
            }}
          />
        </label>
        <label>
          Quantity
          <input
            type="number"
            value={model.quantity}
            onChange={(event) => {
              model.quantity = Number(event.target.value);
            }}
          />
        </label>
        <span>Total: {total}</span>
      </div>
    );
  }
`;

const useRsxModelCode = dedent`
  import { useRsxModel } from '@rs-x/react';

  const model = {
    user: {
      name: 'Alice',
      age: 30,
    },
    score: 95,
  };

  export default function UserCard() {
    // Recursively binds every scalar field — each field re-renders independently
    const { user, score } = useRsxModel(model);

    return (
      <div>
        <p>{user.name} — age {user.age}</p>
        <p>Score: {score}</p>
        <button
          onClick={() => {
            model.user.name = 'Bob';
            model.score = 100;
          }}
        >
          Update model
        </button>
      </div>
    );
  }
`;

const useRsxModelFilterCode = dedent`
  import { useRsxModel, type FieldFilter } from '@rs-x/react';

  const model = {
    name: 'Alice',
    _internal: 'skip this',
    score: 95,
  };

  // Only bind fields that don't start with an underscore
  const publicFieldsOnly: FieldFilter = (_parent, field) => !field.startsWith('_');

  function UserCard() {
    const { name, score } = useRsxModel<typeof model, { name: string; score: number }>(
      model,
      publicFieldsOnly,
    );

    return (
      <p>{name} — {score}</p>
    );
  }
`;

const changeTransactionCode = dedent`
  import { rsx } from '@rs-x/expression-parser';
  import {
    getExpressionChangeTransactionManager,
    useRsxExpression,
    useRsxModel,
  } from '@rs-x/react';

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

  const tx = getExpressionChangeTransactionManager();

  export default function TransactionExample() {
    const total = useRsxExpression(totalExpr);
    const stats = useRsxModel(statsModel);
    const hasMeasurement = stats.lastMode !== 'none';
    const proof =
      stats.commits === stats.expected
        ? \`Verified: \${stats.lastMode} emitted \${stats.commits} time(s).\`
        : \`Unexpected: \${stats.lastMode} emitted \${stats.commits} time(s), expected \${stats.expected}.\`;

    return (
      <div>
        <h3 className="previewSectionTitle">Measured values</h3>
        <dl>
          <div className="metricRow">
            <dt>Price</dt>
            <dd className="metricValue">{orderModel.price}</dd>
          </div>
          <div className="metricRow">
            <dt>Quantity</dt>
            <dd className="metricValue">{orderModel.quantity}</dd>
          </div>
          <div className="metricRow">
            <dt>Total</dt>
            <dd className="metricValue">{total}</dd>
          </div>
          <div className="metricRow">
            <dt>Last action emit count</dt>
            <dd className="metricValue">{stats.commits}</dd>
          </div>
          <div className="metricRow">
            <dt>Expected emit count</dt>
            <dd className="metricValue">{stats.expected}</dd>
          </div>
          <div className="metricRow metricRowResult">
            <dt>Result</dt>
            <dd className={hasMeasurement ? 'metricText' : 'metricText metricTextReserved'}>
              {hasMeasurement ? proof : '\\u00A0'}
            </dd>
          </div>
        </dl>
        <h3 className="previewSectionTitle">How to read this</h3>
        <p className="previewNote">
          Both buttons apply the same two updates: increase price by 10 and quantity by 1.
        </p>
        <p className="previewNote">
          The difference is timing: the first button splits them into two async
          steps, while the transaction keeps those async steps batched until the
          end.
        </p>

        <h3 className="previewSectionTitle">Try it</h3>
        <div className="previewActions">
          <button
            onClick={async () => {
              statsModel.commits = 0;
              statsModel.expected = 2;
              statsModel.lastMode = 'Async updates';
              statsModel.running = true;
              orderModel.price += 10;
              await Promise.resolve();
              orderModel.quantity += 1;
              statsModel.running = false;
            }}
            disabled={stats.running}
          >
            Run async updates without transaction
          </button>

          <button
            onClick={async () => {
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
            }}
            disabled={stats.running}
          >
            Run async updates with transaction
          </button>
        </div>
      </div>
    );
  }

  export function dispose() {
    commitSubscription.unsubscribe();
    totalExpr.dispose();
  }
`;

const doc: CoreConceptDoc = {
  title: 'React integration',
  lead: 'Bind rs-x expressions to React components with rsx + useRsxExpression and useRsxModel — components re-render automatically when model values change.',
  whatItMeans:
    <>
      <p>
        <code>useRsxExpression</code> watches one RS-X expression instance and
        returns its current value to the component. <code>useRsxModel</code>{' '}
        lets a component read fields from a model object and keeps those field
        values up to date as the model changes. In both cases, RS-X tracks the
        dependencies and React re-renders when the value used by the component
        changes.
      </p>
      <p>
        The important rule for React and Next.js client components is that{' '}
        <code>useRsxExpression</code> should receive an expression instance that
        was created earlier, not a new one created during the current render.
        In practice, that usually means either creating the model and
        expression at module scope or creating them inside the component
        with{' '}
        <code>useMemo</code>. Rebinding the expression during render creates a
        new RS-X object graph every time React renders, which breaks the
        subscription lifecycle and can lead to confusing runtime behavior.
      </p>
    </>,
  whyItMatters:
    <>
      <p>
        With the stable-expression pattern, you make plain model updates like{' '}
        <code>model.price = 99</code> and let RS-X trigger the re-render through
        the hook subscription. You do not need React state just to mirror the
        expression result. That keeps the component small and pushes the
        dependency logic into RS-X where it belongs.
      </p>
      <p>
        This also matches how React thinks about hooks. React expects hook
        inputs to have predictable identity when they represent subscriptions or
        external resources. A stable RS-X expression gives the hook one
        long-lived expression instance to read from. That fits the way React
        expects subscription-style inputs to behave over the life of the
        component.
      </p>
    </>,
  keyPoints: [
    'Zero boilerplate — build an expression with rsx(...) and pass it to useRsxExpression.',
    'useRsxExpression accepts a stable pre-built IExpression from rsx(...) and updates the component when that expression changes.',
    'Do not recreate the bound expression during render; create it at module scope or memoize it with useMemo.',
    'useRsxModel recursively binds every scalar field of an object, returning a mirrored object whose fields are live reactive values.',
    "Collections (arrays, maps, sets) are not supported by useRsxModel — they break React's hooks ordering rules. Use rsx(..., { leafWatchRule })(model) with useRsxExpression instead.",
    'getExpressionChangeTransactionManager() lets you batch updates and flush a single commit.',
  ],
  deepDive: [
    {
      title: 'Why Expression Identity Matters',
      paragraphs: [
        <>
          <p>
            <code>useRsxExpression</code> expects you to pass it an expression
            that already exists. In other words, build the RS-X expression
            first, then give that same expression instance to the hook. Once
            the hook receives that expression instance, it can subscribe to it,
            read its current value, and re-render the component whenever that
            expression reports a change.
          </p>
          <p>
            If you call <code>rsx(...)(model)</code> or
            <code> someExpressionFactory(model)</code> inline during render, you
            create a brand new expression object on every render pass. That
            means React is constantly being handed a new subscription target.
            Even if the expression string is identical, the object identity is
            not. In practice that can lead to duplicate observers, lost
            subscriptions, stale references, or model instrumentation edge cases
            because the runtime keeps seeing fresh expression graphs instead of a
            single long-lived one.
          </p>
        </>,
      ],
    },
    {
      title: 'Module-Scoped vs Component-Owned',
      paragraphs: [
        <>
          <p>
            Create the model and bound expression at module scope when the data
            should be reused by every component instance in that module.
          </p>
          <p>
            Use <code>useMemo</code> when the model belongs to one component
            instance. Memoize the model first, then memoize the bound
            expression from that model. That gives each mounted component its
            own isolated RS-X model and expression while still preserving the
            stable identity that the hook needs.
          </p>
          <p>
            In Next.js this rule applies inside client components the same way
            it does in plain React. Server components can prepare data, but the
            actual <code>useRsxExpression</code> subscription still lives in a
            client component and should receive a stable expression instance.
          </p>
        </>,
      ],
    },
  ],
  examples: [
    {
      title: 'useRsxExpression — pre-built IExpression',
      description:
        'Build the expression once at module scope and reuse it. The hook reads from that expression and updates when it changes, but it does not dispose the expression on unmount.',
      code: useRsxExpressionSharedCode,
    },
    {
      title: 'useRsxExpression — create with useMemo',
      description:
        'When the model belongs to the component, memoize the model and let useRsxExpression create and dispose the bound expression for that component instance.',
      code: useRsxExpressionUseMemoCode,
    },
    {
      title: 'useRsxModel — full model binding',
      description:
        'Bind every scalar field in a model object. Each field is independently reactive — React only re-renders the subtree that depends on what changed.',
      code: useRsxModelCode,
    },
    {
      title: 'useRsxModel — field filter',
      description:
        'Pass an optional FieldFilter predicate to exclude fields from binding. Useful for internal or non-reactive properties.',
      code: useRsxModelFilterCode,
    },
    {
      title: 'Expression change transactions',
      description:
        'Run the same two model updates across two async steps. Without a transaction the expression emits twice, and with a transaction it emits once. That shows where transactions help: keeping multi-step async updates private until the final flush.',
      code: changeTransactionCode,
    },
    {
      title: 'Installation',
      description: (
        <>
          Run <code>rsx init</code> in your React project to detect the
          framework, install the right packages, and apply the setup
          automatically. See the <Link href="/docs/core-concepts/cli">CLI docs</Link>.
        </>
      ),
      code: installCode,
    },
  ],
  related: [
    {
      href: 'https://react.dev',
      title: 'React official website',
      meta: 'Docs, guides, and React ecosystem',
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
    canonical: '/docs/frameworks/react',
  },
};

export default function Page() {
  return (
    <CoreConceptPageLayout
      doc={doc}
      headerNote={demoLinks}
      examplesSlot={
        <>
          <article className="card docsApiCard">
            <h2 className="cardTitle">useRsxExpression — pre-built IExpression example</h2>
            <p className="cardText">
              Build the expression once at module scope and reuse it. The hook
              reads from that expression and updates when it changes, but it
              does not dispose the expression on unmount.
            </p>
            <EditableCompiledFrameworkExample
              framework="react"
              initialCode={useRsxExpressionSharedCode}
              editorId="react-expression-prebuilt"
            />
          </article>
          <article className="card docsApiCard">
            <h2 className="cardTitle">useRsxExpression — create with useMemo example</h2>
            <p className="cardText">
              When the model belongs to the component, memoize both the model
              and let useRsxExpression create and dispose the bound expression
              for that component instance.
            </p>
            <EditableCompiledFrameworkExample
              framework="react"
              initialCode={useRsxExpressionUseMemoCode}
              editorId="react-expression-usememo"
            />
          </article>
          <article className="card docsApiCard">
            <h2 className="cardTitle">useRsxModel — full model binding example</h2>
            <p className="cardText">
              Bind every scalar field in a model object. Each field is
              independently reactive — React only re-renders the subtree that
              depends on what changed.
            </p>
            <EditableCompiledFrameworkExample
              framework="react"
              initialCode={useRsxModelCode}
              editorId="react-model-binding"
            />
          </article>
          <article className="card docsApiCard">
            <h2 className="cardTitle">useRsxModel — field filter example</h2>
            <p className="cardText">
              Pass an optional FieldFilter predicate to exclude fields from
              binding. Useful for internal or non-reactive properties.
            </p>
            <SyntaxCodeBlock code={useRsxModelFilterCode} />
          </article>
          <article className="card docsApiCard">
            <h2 className="cardTitle">Expression change transactions example</h2>
            <p className="cardText">
              Run the same two mutations with and without a transaction and
              compare the commit counter: separate updates emit twice, the
              transaction emits once.
            </p>
            <EditableCompiledFrameworkExample
              framework="react"
              initialCode={changeTransactionCode}
              editorId="react-expression-transactions"
            />
          </article>
          <article className="card docsApiCard">
            <h2 className="cardTitle">Installation example</h2>
            <p className="cardText">
              Run rsx init in your React project to install the right packages
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
