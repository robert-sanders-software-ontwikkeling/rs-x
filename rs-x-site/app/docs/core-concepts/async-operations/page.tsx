import dedent from 'dedent';
import type { Metadata } from 'next';
import Link from 'next/link';

import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../_template/core-concept-page';

const asyncPromiseExampleCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    a: 10,
    b: Promise.resolve(20),
  };

  const sum = rsx<number>('a + b')(model);
  const sumChangedSubscription = sum.changed.subscribe(() => {
    console.log('sum:', sum.value);
  });

  const randomInt = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const aInterval = setInterval(() => {
    model.a = randomInt(5, 25);
  }, 2000);

  const bInterval = setInterval(() => {
    model.b = new Promise((resolve) => {
      setTimeout(() => resolve(randomInt(10, 30)), 400);
    });
  }, 4000);

  const originalDispose = sum.dispose.bind(sum);
  let disposed = false;
  sum.dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    clearInterval(aInterval);
    clearInterval(bInterval);
    sumChangedSubscription.unsubscribe();
    originalDispose();
  };
`;

const asyncPromisePlaygroundScript = dedent`
  const rsx = api.rsx;

  const model = {
    a: 10,
    b: Promise.resolve(20),
  };

  const sum = rsx('a + b')(model);
  const sumChangedSubscription = sum.changed.subscribe(() => {
    console.log('sum:', sum.value);
  });

  const randomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const aInterval = setInterval(() => {
    model.a = randomInt(5, 25);
  }, 2000);

  const bInterval = setInterval(() => {
    model.b = new Promise((resolve) => {
      setTimeout(() => resolve(randomInt(10, 30)), 400);
    });
  }, 4000);

  const originalDispose = sum.dispose.bind(sum);
  let disposed = false;
  sum.dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    clearInterval(aInterval);
    clearInterval(bInterval);
    sumChangedSubscription.unsubscribe();
    originalDispose();
  };

  return sum;
`;

const asyncObservableExampleCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';
  import { BehaviorSubject } from 'rxjs';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    a: 10,
    b: new BehaviorSubject(20),
  };

  const sum = rsx<number>('a + b')(model);
  const sumChangedSubscription = sum.changed.subscribe(() => {
    console.log('sum:', sum.value);
  });

  const randomInt = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const aInterval = setInterval(() => {
    model.a = randomInt(5, 25);
  }, 2000);

  const bInterval = setInterval(() => {
    model.b.next(model.b.value + randomInt(3, 12));
  }, 4000);

  const originalDispose = sum.dispose.bind(sum);
  let disposed = false;
  sum.dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    clearInterval(aInterval);
    clearInterval(bInterval);
    sumChangedSubscription.unsubscribe();
    originalDispose();
  };
`;

const asyncObservablePlaygroundScript = dedent`
  const $ = api.rxjs;
  const rsx = api.rsx;

  const model = {
    a: 10,
    b: new $.BehaviorSubject(20),
  };

  const sum = rsx('a + b')(model);
  const sumChangedSubscription = sum.changed.subscribe(() => {
    console.log('sum:', sum.value);
  });

  const randomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const aInterval = setInterval(() => {
    model.a = randomInt(5, 25);
  }, 2000);

  const bInterval = setInterval(() => {
    model.b.next(model.b.value + randomInt(3, 12));
  }, 4000);

  const originalDispose = sum.dispose.bind(sum);
  let disposed = false;
  sum.dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    clearInterval(aInterval);
    clearInterval(bInterval);
    sumChangedSubscription.unsubscribe();
    originalDispose();
  };

  return sum;
`;

const asyncExpressionValueExampleCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const partialModel = {
    base: 10,
    bonus: Promise.resolve(20),
  };

  const partial = rsx<number>('base + bonus')(partialModel);
  const totalModel = {
    a: 5,
    partial,
  };
  const total = rsx<number>('a + partial')(totalModel);

  const totalChangedSubscription = total.changed.subscribe(() => {
    console.log('total:', total.value);
  });

  const randomInt = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const baseInterval = setInterval(() => {
    partialModel.base = randomInt(5, 25);
  }, 2000);

  const bonusInterval = setInterval(() => {
    partialModel.bonus = new Promise((resolve) => {
      setTimeout(() => resolve(randomInt(10, 30)), 400);
    });
  }, 4000);

  const totalInterval = setInterval(() => {
    totalModel.a = randomInt(1, 10);
  }, 6000);

  const originalDispose = total.dispose.bind(total);
  let disposed = false;
  total.dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    clearInterval(baseInterval);
    clearInterval(bonusInterval);
    clearInterval(totalInterval);
    totalChangedSubscription.unsubscribe();
    originalDispose();
  };
`;

const asyncExpressionValuePlaygroundScript = dedent`
  const rsx = api.rsx;

  const partialModel = {
    base: 10,
    bonus: Promise.resolve(20),
  };

  const partial = rsx('base + bonus')(partialModel);
  const totalModel = {
    a: 5,
    partial,
  };
  const total = rsx('a + partial')(totalModel);

  const totalChangedSubscription = total.changed.subscribe(() => {
    console.log('total:', total.value);
  });

  const randomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const baseInterval = setInterval(() => {
    partialModel.base = randomInt(5, 25);
  }, 2000);

  const bonusInterval = setInterval(() => {
    partialModel.bonus = new Promise((resolve) => {
      setTimeout(() => resolve(randomInt(10, 30)), 400);
    });
  }, 4000);

  const totalInterval = setInterval(() => {
    totalModel.a = randomInt(1, 10);
  }, 6000);

  const originalDispose = total.dispose.bind(total);
  let disposed = false;
  total.dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    clearInterval(baseInterval);
    clearInterval(bonusInterval);
    clearInterval(totalInterval);
    totalChangedSubscription.unsubscribe();
    originalDispose();
  };

  return total;
`;

const doc: CoreConceptDoc = {
  title: 'Async operations',
  lead: 'Mix Promise, Observable, and expression values with sync values in one expression.',
  whatItMeans:
    'In rs-x, async and sync values work the same way inside expressions. You can mix both in one expression, and updates from each value type flow through the same reactive pipeline.',
  whyItMatters:
    'You avoid manual await/subscribe glue code per dependency. For example, with { a: 10, b: Promise.resolve(20) } you can bind "a + b" directly.',
  keyPoints: [
    'rs-x currently supports three async entities: Promise, RxJS Observable, and rsx expression values.',
    'rs-x is pluggable, so you can add support for custom async entities.',
    'Expression syntax stays the same for sync and async inputs.',
    'When async values resolve or emit, dependent expressions reevaluate automatically.',
  ],
  examples: [
    {
      title: 'Promise',
      description:
        'Bind directly to a Promise field and treat it like a normal value in the expression.',
      code: asyncPromiseExampleCode,
      playgroundScript: asyncPromisePlaygroundScript,
    },
    {
      title: 'Observable (RxJS)',
      description:
        'Bind directly to an observable source and react to next(...) emissions.',
      code: asyncObservableExampleCode,
      playgroundScript: asyncObservablePlaygroundScript,
    },
    {
      title: 'rsx expression value',
      description:
        'Bind one expression as a value inside another expression, including async inner dependencies.',
      code: asyncExpressionValueExampleCode,
      playgroundScript: asyncExpressionValuePlaygroundScript,
    },
  ],
  related: [
    {
      href: '/docs/async-operations',
      title: 'Advanced: Async operations',
      meta: 'Metadata/accessor/observer internals and commit flow',
    },
    {
      href: '/docs/observation/promise',
      title: 'Promise observation',
      meta: 'Observer + accessor pipeline for Promise values',
    },
    {
      href: '/docs/observation/observable',
      title: 'Observable observation',
      meta: 'Observer + accessor pipeline for Observable values',
    },
    {
      href: '/docs/modular-expressions',
      title: 'Expression implementation',
      meta: 'How expression value-type plugins are wired',
    },
  ],
};

export const metadata: Metadata = {
  title: doc.title,
  description: doc.lead,
};

export default function Page() {
  return (
    <CoreConceptPageLayout
      doc={doc}
      headerNote={
        <p className="cardText">
          For runtime internals, see the{' '}
          <Link href="/docs/async-operations">
            advanced async operations page
          </Link>
          .
        </p>
      }
    />
  );
}
