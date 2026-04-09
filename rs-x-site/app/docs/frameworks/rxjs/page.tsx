import dedent from 'dedent';
import type { Metadata } from 'next';

import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../../core-concepts/_template/core-concept-page';

const installCode = dedent`
  # CLI (recommended)
  rsx init
  npm install rxjs

  # Manual
  npm install @rs-x/core @rs-x/state-manager @rs-x/expression-parser rxjs
`;

const rxjsBasicCode = dedent`
  import { BehaviorSubject } from 'rxjs';
  import { rsx } from '@rs-x/expression-parser';

  const model = {
    price: new BehaviorSubject(100),
    quantity: 2,
  };

  // Observable values participate in expressions like normal fields
  const totalExpr = rsx<number>('price * quantity')(model);

  totalExpr.changed.subscribe(() => {
    console.log('total:', totalExpr.value);
  });

  model.quantity = 3; // logs "total: 300"
  model.price.next(120); // logs "total: 360"
`;

const rxjsBasicPlaygroundScript = dedent`
  const $ = rxjs;

  const model = {
    price: new $.BehaviorSubject(100),
    quantity: 2,
  };

  // Observable values participate in expressions like normal fields
  const totalExpr = rsx('price * quantity')(model);

  totalExpr.changed.subscribe(() => {
    console.log('total:', totalExpr.value);
  });

  model.quantity = 3; // logs "total: 300"
  model.price.next(120); // logs "total: 360"

  return totalExpr;
`;

const rxjsNestedCode = dedent`
  import { BehaviorSubject } from 'rxjs';
  import { rsx } from '@rs-x/expression-parser';

  // Observable that emits objects which contain Observables
  const model = {
    cart: new BehaviorSubject([
      { price: new BehaviorSubject(10) },
      { price: new BehaviorSubject(20) },
    ]),
  };

  const firstPrice = rsx<number>('cart[0].price')(model);

  firstPrice.changed.subscribe(() => {
    console.log('first price:', firstPrice.value);
  });

  model.cart.value[0].price.next(15); // logs "first price: 15"
`;

const rxjsNestedPlaygroundScript = dedent`
  const $ = rxjs;

  // Observable that emits objects which contain Observables
  const model = {
    cart: new $.BehaviorSubject([
      { price: new $.BehaviorSubject(10) },
      { price: new $.BehaviorSubject(20) },
    ]),
  };

  const firstPrice = rsx('cart[0].price')(model);

  firstPrice.changed.subscribe(() => {
    console.log('first price:', firstPrice.value);
  });

  model.cart.value[0].price.next(15); // logs "first price: 15"

  return firstPrice;
`;

const doc: CoreConceptDoc = {
  title: 'RxJS integration',
  lead: 'Use RxJS Observables directly inside rs-x expressions — emissions flow into the reactive graph and trigger expression updates.',
  whatItMeans:
    'rs-x treats Observable-like values as reactive sources. When an Observable emits, dependent expressions re-evaluate and fire changed events.',
  whyItMatters:
    'You can mix plain model fields and Observables in the same expression without manual subscription plumbing. This is useful for integrating streams with domain models or UI state.',
  keyPoints: [
    'No adapter required — import rsx from @rs-x/expression-parser and use Observables in your model.',
    'Observable emissions trigger expression re-evaluation and changed notifications.',
    'Works with nested member expressions, including arrays and maps.',
  ],
  examples: [
    {
      title: 'Basic Observable binding',
      description:
        'Observable values participate in expressions like normal fields.',
      code: rxjsBasicCode,
      playgroundScript: rxjsBasicPlaygroundScript,
    },
    {
      title: 'Nested Observable values',
      description:
        'Observable emits array entries that themselves contain Observable properties.',
      code: rxjsNestedCode,
      playgroundScript: rxjsNestedPlaygroundScript,
    },
    {
      title: 'Installation',
      description: 'Install the core runtime packages and RxJS.',
      code: installCode,
    },
  ],
  related: [
    {
      href: 'https://rxjs.dev',
      title: 'RxJS official website',
      meta: 'API docs, guides, and RxJS resources',
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
    <a className="btn btnPrimary" href="/get-started?track=existing">
      RxJS setup <span aria-hidden="true">→</span>
    </a>
  </div>
);

export default function Page() {
  return <CoreConceptPageLayout doc={doc} headerNote={headerNote} />;
}
