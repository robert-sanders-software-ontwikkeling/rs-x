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

const useRsxExpressionBasicCode = dedent`
  import { useRsxExpression } from '@rs-x/react';

  const model = {
    firstName: 'Jane',
    lastName: 'Doe',
  };

  function FullName() {
    // Re-renders automatically whenever firstName or lastName changes
    const fullName = useRsxExpression<string>('firstName + " " + lastName', { model });

    return <span>{fullName}</span>;
  }
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

    return <span>Total: {total}</span>;
  }

  // Mutate the model anywhere — OrderTotal re-renders automatically
  model.quantity = 5;
`;

const useRsxExpressionLeafWatchCode = dedent`
  import { useRsxExpression } from '@rs-x/react';
  import type { IIndexWatchRule } from '@rs-x/state-manager';

  const model = {
    items: ['apple', 'banana', 'cherry'],
  };

  // Watch only index 0 — the component ignores changes to other indices
  const watchFirstOnly: IIndexWatchRule = {
    id: 'first-index-only',
    context: null,
    test(index, target) {
      return Array.isArray(target) && index === 0;
    },
    dispose() {},
  };

  function FirstItem() {
    const first = useRsxExpression<string>('items', {
      model,
      leafWatchRule: watchFirstOnly,
    });

    return <span>First item: {first?.[0]}</span>;
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
    const { user, score } = useRsxModel<typeof model, typeof model>(model);

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

const getExpressionFactoryCode = dedent`
  import { getExpressionFactory } from '@rs-x/react';

  const model = { x: 10, y: 20 };

  // Get the singleton factory — auto-initialises the rs-x module on first call
  const factory = getExpressionFactory();
  const sum = factory.create<number>(model, 'x + y');

  sum.changed.subscribe(() => {
    console.log('sum:', sum.value); // logs whenever x or y changes
  });

  model.x = 42; // → logs "sum: 62"
`;

const getExpressionManagerCode = dedent`
  import { getExpressionManager } from '@rs-x/react';

  const model = { a: 1, b: 2 };

  const manager = getExpressionManager();

  // Parse an expression without binding it to a model
  const parsed = manager.parse('a + b');
  console.log(parsed); // expression AST
`;

const doc: CoreConceptDoc = {
  title: 'React integration',
  lead: 'Bind rs-x expressions to React components with useRsxExpression and useRsxModel — components re-render automatically when model values change.',
  whatItMeans:
    '@rs-x/react provides two hooks that subscribe to rs-x expressions and trigger React re-renders when values change. useRsxExpression binds a single expression, while useRsxModel walks an entire model object and binds every scalar field. Both hooks clean up their subscriptions automatically when the component unmounts.',
  whyItMatters:
    'You write plain model mutations — model.price = 99 — and every component that reads that field re-renders without any manual setState, useEffect subscription wiring, or context boilerplate. The expression engine handles fine-grained dependency tracking, so only the components that actually depend on a changed value re-render.',
  keyPoints: [
    'Zero boilerplate — pass a model and an expression string, the hook returns a live value.',
    'useRsxExpression accepts either a string (creates its own expression, owns the lifecycle) or a pre-built IExpression (subscribes only, does not dispose on unmount).',
    'useRsxModel recursively binds every scalar field of an object, returning a mirrored object whose fields are live reactive values.',
    "Collections (arrays, maps, sets) are not supported by useRsxModel — they break React's hooks ordering rules. Use useRsxExpression with a leafWatchRule instead.",
    'getExpressionFactory() and getExpressionManager() are singleton helpers that auto-initialise the rs-x DI container on first call — no manual setup required.',
  ],
  examples: [
    {
      title: 'useRsxExpression — string expression',
      description:
        'Pass a model and an expression string. The component re-renders whenever firstName or lastName changes on the model.',
      code: useRsxExpressionBasicCode,
    },
    {
      title: 'useRsxExpression — pre-built IExpression',
      description:
        'Build the expression once outside the component and share it. The hook subscribes to changes but does not dispose the expression on unmount.',
      code: useRsxExpressionSharedCode,
    },
    {
      title: 'useRsxExpression — leafWatchRule',
      description:
        'Narrow which array indices trigger a re-render by passing a leafWatchRule. Useful for large collections where you only care about specific items.',
      code: useRsxExpressionLeafWatchCode,
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
      title: 'getExpressionFactory',
      description:
        'Access the underlying IExpressionFactory singleton directly. Useful outside React components — for example in service files or utility hooks.',
      code: getExpressionFactoryCode,
    },
    {
      title: 'getExpressionManager',
      description:
        'Access the IExpressionManager singleton to parse expressions without binding them to a model.',
      code: getExpressionManagerCode,
    },
    {
      title: 'Installation',
      description: 'Install all required packages.',
      code: installCode,
    },
  ],
  related: [
    {
      href: '/docs/frameworks/angular',
      title: 'Angular integration',
      meta: 'RsxPipe and providexRsx() for Angular templates',
    },
    {
      href: '/docs/frameworks/vue',
      title: 'Vue integration',
      meta: 'Composition API patterns with rs-x expressions',
    },
    {
      href: '/docs/frameworks/rxjs',
      title: 'RxJS integration',
      meta: 'Observable values inside expressions',
    },
    {
      href: '/docs/core-concepts/async-operations',
      title: 'Async operations',
      meta: 'Mix Promise/Observable/expression values with sync values',
    },
    {
      href: '/docs/core-concepts/member-expressions',
      title: 'Member expressions',
      meta: 'Nested property and member access',
    },
    {
      href: '/docs/core-concepts/modular-expressions',
      title: 'Modular expressions',
      meta: 'Compose reusable expression parts',
    },
    {
      href: '/docs/collections',
      title: 'Collections',
      meta: 'Array/Map/Set guide with specific-item monitoring examples',
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
