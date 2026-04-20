import dedent from 'dedent';
import type { Metadata } from 'next';
import Link from 'next/link';

import { EditableCompiledFrameworkExample } from '@rs-x/react-components';

import { SyntaxCodeBlock } from '../../../../components/SyntaxCodeBlock';
import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../../core-concepts/_template/core-concept-page';

const installCode = dedent`
  rsx init
`;

const outsideComponentCode = dedent`
  'use client';

  import { rsx } from '@rs-x/expression-parser';
  import { useRsxExpression } from '@rs-x/react';

  const pageModel = { price: 100, quantity: 3 };
  const totalExpr = rsx<number>('price * quantity')(pageModel);

  export default function OrderPage() {
    const total = useRsxExpression(totalExpr);

    return (
      <main>
        <input
          type="number"
          value={pageModel.price}
          onChange={(event) => {
            pageModel.price = Number(event.target.value);
          }}
        />
        <input
          type="number"
          value={pageModel.quantity}
          onChange={(event) => {
            pageModel.quantity = Number(event.target.value);
          }}
        />
        <p>Total: {total}</p>
      </main>
    );
  }
`;

const useMemoCode = dedent`
  'use client';

  import { useMemo } from 'react';
  import { rsx } from '@rs-x/expression-parser';
  import { useRsxExpression } from '@rs-x/react';

  export default function OrderPage() {
    const model = useMemo(() => ({ price: 100, quantity: 3 }), []);
    const total = useRsxExpression(
      () => rsx<number>('price * quantity')(model),
    );

    return (
      <main>
        <input
          type="number"
          value={model.price}
          onChange={(event) => {
            model.price = Number(event.target.value);
          }}
        />
        <input
          type="number"
          value={model.quantity}
          onChange={(event) => {
            model.quantity = Number(event.target.value);
          }}
        />
        <p>Total: {total}</p>
      </main>
    );
  }
`;

const useRsxModelCode = dedent`
  'use client';

  import { useRsxModel } from '@rs-x/react';

  const model = {
    user: {
      name: 'Alice',
      age: 30,
    },
    score: 95,
  };

  export default function UserCard() {
    const { user, score } = useRsxModel(model);

    return (
      <main>
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
      </main>
    );
  }
`;

const wrongPatternCode = dedent`
  'use client';

  import { rsx } from '@rs-x/expression-parser';
  import { useRsxExpression } from '@rs-x/react';

  export default function OrderPage() {
    const model = { price: 100, quantity: 3 };

    // Avoid this pattern in React / Next.js:
    // it creates a brand new expression during every render.
    const total = useRsxExpression(rsx<number>('price * quantity')(model));

    return <p>Total: {total}</p>;
  }
`;

const transactionCode = dedent`
  'use client';

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

  export default function OrderPage() {
    const total = useRsxExpression(totalExpr);
    const stats = useRsxModel(statsModel);
    const hasMeasurement = stats.lastMode !== 'none';
    const proof =
      stats.commits === stats.expected
        ? \`Verified: \${stats.lastMode} emitted \${stats.commits} time(s).\`
        : \`Unexpected: \${stats.lastMode} emitted \${stats.commits} time(s), expected \${stats.expected}.\`;

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

    return (
      <main>
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
          <button onClick={runWithoutTransaction} disabled={stats.running}>
            Run async updates without transaction
          </button>
          <button onClick={runWithTransaction} disabled={stats.running}>
            Run async updates with transaction
          </button>
        </div>
      </main>
    );
  }

  export function dispose() {
    commitSubscription.unsubscribe();
    totalExpr.dispose();
  }
`;

const doc: CoreConceptDoc = {
  title: 'Next.js integration',
  lead: 'Use rs-x inside Next.js client components with the same core rule as React: create the expression first, then pass that same expression instance to useRsxExpression.',
  whatItMeans: (
    <>
      <p>
        In Next.js, <code>useRsxExpression</code> belongs in client components.
        Server components can fetch data or compose layout, but the actual RS-X
        hook subscription runs on the client.
      </p>
      <p>
        The React part is the same as plain React: do not create a new bound
        expression during every render. Build the expression first, then pass
        that same expression instance to <code>useRsxExpression</code>.
      </p>
      <p>
        The Next.js-specific difference is where that code can live. In plain
        React, the question is only how to create the expression. In Next.js,
        you also have to decide which part of the tree is a server component and
        which part is a client component.
      </p>
    </>
  ),
  whyItMatters: (
    <>
      <p>
        Next.js adds server and client boundaries, but the React hook behavior
        is still the same on the client side. If a client component creates a
        fresh RS-X expression during every render, the hook keeps seeing a new
        expression object instead of one long-lived expression to subscribe to.
      </p>
      <p>
        When you create the expression at module scope or let
        <code> useRsxExpression</code> create it from a stable client-side
        model, the hook can stay connected to one expression instance and let
        RS-X drive the re-renders from normal model mutations.
      </p>
    </>
  ),
  keyPoints: [
    'useRsxExpression is for client components in Next.js.',
    'The expression-identity rule is the same as React.',
    'The Next.js-specific part is deciding where the client boundary should be.',
    'Create the expression before passing it to the hook.',
    'Use module-scoped expressions when the same model should be reused by that file.',
    'Use useMemo when the model belongs to one client component instance.',
    'Do not call rsx(...)(model) inline during render in a Next.js client component.',
    'The bootstrap wiring from rsx init handles runtime setup, but component expression identity is still your responsibility.',
  ],
  deepDive: [
    {
      title: 'Server Components vs Client Components',
      paragraphs: [
        <>
          <p>
            RS-X hook usage in Next.js starts with the normal React client
            component boundary. A server component cannot call
            <code> useRsxExpression</code>. Instead, put the hook inside a{' '}
            <code>'use client'</code> component and let that client component
            own the RS-X model and expression, or import them from a shared
            client-side module.
          </p>
          <p>
            This means the React guidance and the Next.js guidance are really
            the same guidance seen from two angles: Next.js determines where the
            hook is allowed to run, and React determines how the hook input
            should be created.
          </p>
        </>,
      ],
    },
    {
      title: 'How Next.js Differs From React',
      paragraphs: [
        <>
          <p>
            If you already understand the React page, the hook behavior here is
            not new. The same rules about expression identity, disposal, and
            component-owned state still apply.
          </p>
          <p>
            The extra decision in Next.js is architectural rather than
            hook-specific: decide which data preparation can stay on the server,
            then pass plain values into a client component that owns the RS-X
            model, expression, and user interaction.
          </p>
        </>,
      ],
    },
    {
      title: 'Module-Scoped vs Component-Owned',
      paragraphs: [
        <>
          <p>
            Create the model and expression at module scope when you want the
            same model and expression to be reused by that file.
          </p>
          <p>
            Use <code>useMemo</code> when the model should belong to a single
            mounted component instance. Memoize the model first, then let
            <code> useRsxExpression</code> create the bound expression from that
            model. That gives the component its own isolated RS-X state while
            still ensuring the hook keeps one long-lived expression instance.
          </p>
        </>,
      ],
    },
    {
      title: 'What To Avoid',
      paragraphs: [
        <>
          <p>
            Avoid binding the expression inline during render. That pattern
            looks compact, but it creates a new expression every time the
            component renders. In React and Next.js client components, that can
            lead to confusing subscription churn and runtime issues because the
            hook is no longer attached to one consistent expression instance.
          </p>
        </>,
      ],
      code: wrongPatternCode,
    },
  ],
  examples: [
    {
      title: 'useRsxExpression — pre-built IExpression',
      description:
        'Create the model and bound expression once at module scope, then read them from a Next.js client component.',
      code: outsideComponentCode,
    },
    {
      title: 'useRsxExpression — create with useMemo',
      description:
        'When the model belongs to the page or client component, memoize the model and let useRsxExpression create and dispose the bound expression for that instance.',
      code: useMemoCode,
    },
    {
      title: 'useRsxModel — full model binding',
      description:
        'Bind a whole model object and let the client component read fields directly while updates to the original model still refresh the UI.',
      code: useRsxModelCode,
    },
    {
      title: 'Expression change transactions',
      description:
        'Run the same two async updates with and without a transaction and compare the commit counter.',
      code: transactionCode,
    },
    {
      title: 'Installation',
      description: (
        <>
          Run <code>rsx init</code> in your Next.js project to detect the
          framework, install the right packages, and apply the setup
          automatically. See the{' '}
          <Link href="/docs/core-concepts/cli">CLI docs</Link>.
        </>
      ),
      code: installCode,
    },
  ],
  related: [
    {
      href: '/docs/frameworks/react',
      title: 'React integration',
      meta: 'Same hook rules, without the Next.js server/client split',
    },
    {
      href: '/docs/core-concepts/cli',
      title: 'CLI',
      meta: 'Use rsx init or rsx project nextjs to wire bootstrap and build setup',
    },
    {
      href: '/get-started?track=next',
      title: 'Next.js get started',
      meta: 'Scaffold a Next.js app with rs-x integration',
    },
    {
      href: '/docs/core-concepts/compiler',
      title: 'Compiler',
      meta: 'Understand compiled and lazy expressions in app builds',
    },
  ],
};

export const metadata: Metadata = {
  title: doc.title,
  description: doc.lead,
  alternates: {
    canonical: '/docs/frameworks/nextjs',
  },
};

export default function Page() {
  return (
    <CoreConceptPageLayout
      doc={doc}
      examplesSlot={
        <>
          <article className="card docsApiCard">
            <h2 className="cardTitle">
              useRsxExpression — pre-built IExpression example
            </h2>
            <p className="cardText">
              Build the expression once at module scope and reuse it in a
              Next.js client component. The hook reads from that expression and
              updates when it changes, but it does not dispose the expression on
              unmount.
            </p>
            <EditableCompiledFrameworkExample
              framework="nextjs"
              initialCode={outsideComponentCode}
              editorId="next-expression-prebuilt"
            />
          </article>
          <article className="card docsApiCard">
            <h2 className="cardTitle">
              useRsxExpression — create with useMemo example
            </h2>
            <p className="cardText">
              When the model belongs to the page or client component, memoize
              the model and let useRsxExpression create and dispose the bound
              expression for that component instance.
            </p>
            <EditableCompiledFrameworkExample
              framework="nextjs"
              initialCode={useMemoCode}
              editorId="next-expression-usememo"
            />
          </article>
          <article className="card docsApiCard">
            <h2 className="cardTitle">
              useRsxModel — full model binding example
            </h2>
            <p className="cardText">
              Bind every scalar field in a model object. In a Next.js client
              component, the component can read those fields directly and the UI
              updates when the original model changes.
            </p>
            <EditableCompiledFrameworkExample
              framework="nextjs"
              initialCode={useRsxModelCode}
              editorId="next-model-binding"
            />
          </article>
          <article className="card docsApiCard">
            <h2 className="cardTitle">
              Expression change transactions example
            </h2>
            <p className="cardText">
              Run the same two async updates with and without a transaction and
              compare the commit counter.
            </p>
            <EditableCompiledFrameworkExample
              framework="nextjs"
              initialCode={transactionCode}
              editorId="next-expression-transactions"
            />
          </article>
          <article className="card docsApiCard">
            <h2 className="cardTitle">Installation example</h2>
            <p className="cardText">
              Run rsx init in your Next.js project to install the right packages
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
