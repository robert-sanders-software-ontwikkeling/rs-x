import dedent from 'dedent';
import type { Metadata } from 'next';

import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../../core-concepts/_template/core-concept-page';

const installCode = dedent`
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

const rxjsNestedCode = dedent`
  import { BehaviorSubject } from 'rxjs';
  import { rsx } from '@rs-x/expression-parser';

  const model = {
    cart: [{ price: new BehaviorSubject(10) }, { price: new BehaviorSubject(20) }],
  };

  const firstPrice = rsx<number>('cart[0].price')(model);

  firstPrice.changed.subscribe(() => {
    console.log('first price:', firstPrice.value);
  });

  model.cart[0].price.next(15); // logs "first price: 15"
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
    },
    {
      title: 'Nested Observable values',
      description: 'Bind to nested Observable properties inside array entries.',
      code: rxjsNestedCode,
    },
    {
      title: 'Installation',
      description: 'Install the core runtime packages and RxJS.',
      code: installCode,
    },
  ],
  related: [
    {
      href: '/docs/core-concepts/async-operations',
      title: 'Async operations',
      meta: 'Promises and Observables in expressions',
    },
    {
      href: '/docs/collections',
      title: 'Collections',
      meta: 'Array/Map/Set indexing and reactive updates',
    },
    {
      href: '/docs/frameworks/react',
      title: 'React integration',
      meta: 'Hook-based bindings for expressions',
    },
    {
      href: '/docs/frameworks/angular',
      title: 'Angular integration',
      meta: 'RsxPipe for templates',
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
