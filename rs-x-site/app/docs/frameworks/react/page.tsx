import dedent from 'dedent';
import type { Metadata } from 'next';

import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../../core-concepts/_template/core-concept-page';

const demoLinks = (
  <div className="docsApiActions" style={{ marginTop: '1rem' }}>
    <a
      className="btn btnGhost"
      href="https://stackblitz.com/~/github.com/robert-sanders-software-ontwikkeling/rs-x-react-demo"
      target="_blank"
      rel="noopener noreferrer"
    >
      Open in StackBlitz <span aria-hidden="true">↗</span>
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
  npm install @rs-x/core @rs-x/state-manager @rs-x/expression-parser @rs-x/react
`;

const useRsxExpressionSharedCode = dedent`
  import { rsx } from '@rs-x/expression-parser';
  import { useRsxExpression } from '@rs-x/react';

  // Create a shared expression once — outside the component
  const model = { price: 100, quantity: 3 };
  const totalExpr = rsx<number>('price * quantity')(model);

  function OrderTotal() {
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

  function UserCard() {
    // Recursively binds every scalar field — each field re-renders independently
    const { user, score } = useRsxModel(model);

    return (
      <div>
        <p>{user.name} — age {user.age}</p>
        <p>Score: {score}</p>
      </div>
    );
  }

  // Update any field — only the components that depend on it re-render
  model.user.name = 'Bob';
  model.score = 100;
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
  import { getExpressionChangeTransactionManager } from '@rs-x/react';

  const model = { price: 100, quantity: 2 };
  const totalExpr = rsx<number>('price * quantity')(model);

  const tx = getExpressionChangeTransactionManager();

  // Batch multiple mutations into a single commit
  tx.suspend();
  model.price = 120;
  model.quantity = 3;
  tx.continue(); // commits once after resuming

  totalExpr.changed.subscribe(() => {
    console.log('total:', totalExpr.value);
  });
`;

const doc: CoreConceptDoc = {
  title: 'React integration',
  lead: 'Bind rs-x expressions to React components with rsx + useRsxExpression and useRsxModel — components re-render automatically when model values change.',
  whatItMeans:
    '@rs-x/react provides two hooks that subscribe to rs-x expressions and trigger React re-renders when values change. useRsxExpression binds a single expression, while useRsxModel walks an entire model object and binds every scalar field. Both hooks clean up their subscriptions automatically when the component unmounts.',
  whyItMatters:
    'You write plain model mutations — model.price = 99 — and every component that reads that field re-renders without any manual setState, useEffect subscription wiring, or context boilerplate. The expression engine handles fine-grained dependency tracking, so only the components that actually depend on a changed value re-render.',
  keyPoints: [
    'Zero boilerplate — build an expression with rsx(...) and pass it to useRsxExpression.',
    'useRsxExpression accepts a pre-built IExpression from rsx(...) and subscribes to changes.',
    'useRsxModel recursively binds every scalar field of an object, returning a mirrored object whose fields are live reactive values.',
    "Collections (arrays, maps, sets) are not supported by useRsxModel — they break React's hooks ordering rules. Use rsx(..., { leafWatchRule })(model) with useRsxExpression instead.",
    'getExpressionChangeTransactionManager() lets you batch updates and flush a single commit.',
  ],
  examples: [
    {
      title: 'useRsxExpression — pre-built IExpression',
      description:
        'Build the expression once outside the component and share it. The hook subscribes to changes but does not dispose the expression on unmount.',
      code: useRsxExpressionSharedCode,
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
        'Suspend and resume expression commits to batch multiple updates.',
      code: changeTransactionCode,
    },
    {
      title: 'Installation',
      description: 'Install all required packages.',
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
};

export default function Page() {
  return <CoreConceptPageLayout doc={doc} headerNote={demoLinks} />;
}
