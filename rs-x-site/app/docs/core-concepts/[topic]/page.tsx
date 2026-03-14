import dedent from 'dedent';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ItemLinkCardContent } from '@rs-x/react-components';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../../components/SyntaxCodeBlock';

import { MemberExpressionExamplesTabs } from './member-expression-examples-tabs.client';

type RelatedLink = {
  href: string;
  title: string;
  meta: string;
};

type CoreConceptExample = {
  title: string;
  description: string;
  code: string;
  playgroundScript?: string;
};

type CoreConceptDoc = {
  slug: string;
  title: string;
  lead: string;
  whatItMeans: string;
  whyItMatters: string;
  keyPoints: string[];
  deepDive?: Array<{
    title: string;
    paragraphs: string[];
  }>;
  exampleCode?: string;
  playgroundScript?: string;
  examples?: CoreConceptExample[];
  related: RelatedLink[];
};

const toPlaygroundHref = (script: string): string =>
  `/playground?data=${encodeURIComponent(`plain:${encodeURIComponent(script)}`)}`;

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

const batchingTransactionsExampleCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import {
    type IExpressionChangeTransactionManager,
    rsx,
    RsXExpressionParserInjectionTokens,
    RsXExpressionParserModule,
  } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const tx = InjectionContainer.get<IExpressionChangeTransactionManager>(
    RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager,
  );

  const model = {
    subtotal: 100,
    shipping: 15,
    discount: 5,
  };

  const totalExpression = rsx<number>('subtotal + shipping - discount')(model);

  let changeCount = 0;
  totalExpression.changed.subscribe(() => {
    changeCount++;
    console.log('changed ->', totalExpression.value);
  });

  await new WaitForEvent(totalExpression, 'changed').wait(emptyFunction);
  // Intentionally use next task (setTimeout 0), not queueMicrotask.
  // Commit processing can chain multiple microtasks, and we want a full
  // boundary so each write is observed as a separate unbatched step.
  const flushCommitQueue = (): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(() => resolve(undefined), 0);
    });

  const beforeWithoutSuspend = changeCount;
  model.subtotal = 120;
  await flushCommitQueue();
  model.shipping = 20;
  await flushCommitQueue();
  model.discount = 10;
  await flushCommitQueue();
  console.log('without suspend emissions:', changeCount - beforeWithoutSuspend); // 3

  const beforeWithSuspend = changeCount;
  tx.suspend();
  model.subtotal = 150;
  await flushCommitQueue();
  model.shipping = 25;
  await flushCommitQueue();
  model.discount = 15;
  await flushCommitQueue();
  tx.continue();
  await flushCommitQueue();
  console.log('with suspend emissions:', changeCount - beforeWithSuspend); // 1
  console.log('final total:', totalExpression.value); // 160
`;

const batchingTransactionsPlaygroundScript = dedent`
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const tx = api.ExpressionChangeTransactionManager;
  const emptyFunction = () => {};

  const model = {
    subtotal: 100,
    shipping: 15,
    discount: 5,
  };

  const totalExpression = rsx('subtotal + shipping - discount')(model);

  let changeCount = 0;
  totalExpression.changed.subscribe(() => {
    changeCount++;
    console.log('changed ->', totalExpression.value);
  });

  await new WaitForEvent(totalExpression, 'changed').wait(emptyFunction);
  // Intentionally use next task (setTimeout 0), not queueMicrotask.
  // Commit processing can chain multiple microtasks, and we want a full
  // boundary so each write is observed as a separate unbatched step.
  const flushCommitQueue = () =>
    new Promise((resolve) => {
      setTimeout(() => resolve(undefined), 0);
    });

  const beforeWithoutSuspend = changeCount;
  model.subtotal = 120;
  await flushCommitQueue();
  model.shipping = 20;
  await flushCommitQueue();
  model.discount = 10;
  await flushCommitQueue();
  console.log('without suspend emissions:', changeCount - beforeWithoutSuspend); // 3

  const beforeWithSuspend = changeCount;
  tx.suspend();
  model.subtotal = 150;
  await flushCommitQueue();
  model.shipping = 25;
  await flushCommitQueue();
  model.discount = 15;
  await flushCommitQueue();
  tx.continue();
  await flushCommitQueue();
  console.log('with suspend emissions:', changeCount - beforeWithSuspend); // 1
  console.log('final total:', totalExpression.value); // 160

  return totalExpression;
`;

const memberFunctionExampleCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    cart: {
      items: [
        { id: 'A', qty: 1 },
        { id: 'B', qty: 2 },
      ],
      first() {
        return this.items[0];
      },
    },
  };

  const firstQtyExpression = rsx<number>('cart.first().qty')(model);
  await new WaitForEvent(firstQtyExpression, 'changed').wait(emptyFunction);

  const changed = await new WaitForEvent(firstQtyExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.cart.items[0].qty = 4;
  });

  console.log('function member emitted:', changed === firstQtyExpression); // true
  console.log('qty:', firstQtyExpression.value); // 4
`;

const memberFunctionPlaygroundScript = dedent`
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const emptyFunction = () => {};

  const model = {
    cart: {
      items: [
        { id: 'A', qty: 1 },
        { id: 'B', qty: 2 },
      ],
      first() {
        return this.items[0];
      },
    },
  };

  const firstQtyExpression = rsx('cart.first().qty')(model);
  await new WaitForEvent(firstQtyExpression, 'changed').wait(emptyFunction);

  const changed = await new WaitForEvent(firstQtyExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.cart.items[0].qty = 4;
  });

  console.log('function member emitted:', changed === firstQtyExpression); // true
  console.log('qty:', firstQtyExpression.value); // 4

  return firstQtyExpression;
`;

const memberFunctionWithArgsExampleCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    selectedId: 'B',
    cart: {
      items: [
        { id: 'A', qty: 1 },
        { id: 'B', qty: 2 },
      ],
      byId(id: string) {
        return this.items.find((item) => item.id === id);
      },
    },
  };

  const selectedQtyExpression = rsx<number>('cart.byId(selectedId).qty')(model);
  await new WaitForEvent(selectedQtyExpression, 'changed').wait(emptyFunction);

  const argumentChange = await new WaitForEvent(selectedQtyExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.selectedId = 'A';
  });

  console.log('argument change emitted:', argumentChange === selectedQtyExpression); // true
  console.log('selected qty:', selectedQtyExpression.value); // 1

  const memberValueChange = await new WaitForEvent(selectedQtyExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.cart.items[0].qty = 5;
  });

  console.log(
    'selected item qty change emitted:',
    memberValueChange === selectedQtyExpression,
  ); // true
  console.log('selected qty after update:', selectedQtyExpression.value); // 5
`;

const memberFunctionWithArgsPlaygroundScript = dedent`
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const emptyFunction = () => {};

  const model = {
    selectedId: 'B',
    cart: {
      items: [
        { id: 'A', qty: 1 },
        { id: 'B', qty: 2 },
      ],
      byId(id) {
        return this.items.find((item) => item.id === id);
      },
    },
  };

  const selectedQtyExpression = rsx('cart.byId(selectedId).qty')(model);
  await new WaitForEvent(selectedQtyExpression, 'changed').wait(emptyFunction);

  const argumentChange = await new WaitForEvent(selectedQtyExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.selectedId = 'A';
  });

  console.log('argument change emitted:', argumentChange === selectedQtyExpression); // true
  console.log('selected qty:', selectedQtyExpression.value); // 1

  const memberValueChange = await new WaitForEvent(selectedQtyExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.cart.items[0].qty = 5;
  });

  console.log(
    'selected item qty change emitted:',
    memberValueChange === selectedQtyExpression,
  ); // true
  console.log('selected qty after update:', selectedQtyExpression.value); // 5

  return selectedQtyExpression;
`;

const memberSequenceExampleCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    a: undefined as { b: number } | undefined,
    initializeCalls: 0,
    initializeA() {
      this.initializeCalls++;
      if (!this.a) {
        this.a = { b: 1 };
      }
    },
  };

  const sequenceMemberExpression = rsx<number>('(initializeA(), a).b')(model);
  await new WaitForEvent(sequenceMemberExpression, 'changed').wait(emptyFunction);

  console.log('initial value:', sequenceMemberExpression.value); // 1
  console.log('initialize calls after first evaluation:', model.initializeCalls); // >= 1

  const changed = await new WaitForEvent(sequenceMemberExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.a = { b: 10 };
  });

  console.log('sequence member emitted:', changed === sequenceMemberExpression); // true
  console.log('updated value:', sequenceMemberExpression.value); // 10
`;

const memberSequencePlaygroundScript = dedent`
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const emptyFunction = () => {};

  const model = {
    a: undefined,
    initializeCalls: 0,
    initializeA() {
      this.initializeCalls++;
      if (!this.a) {
        this.a = { b: 1 };
      }
    },
  };

  const sequenceMemberExpression = rsx('(initializeA(), a).b')(model);
  await new WaitForEvent(sequenceMemberExpression, 'changed').wait(emptyFunction);

  console.log('initial value:', sequenceMemberExpression.value); // 1
  console.log('initialize calls after first evaluation:', model.initializeCalls); // >= 1

  const changed = await new WaitForEvent(sequenceMemberExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.a = { b: 10 };
  });

  console.log('sequence member emitted:', changed === sequenceMemberExpression); // true
  console.log('updated value:', sequenceMemberExpression.value); // 10

  return sequenceMemberExpression;
`;

const memberArrayExampleCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    orders: [
      {
        lines: [
          { sku: 'A', total: 10 },
          { sku: 'B', total: 20 },
        ],
      },
    ],
  };

  const lineTotalExpression = rsx<number>('orders[0].lines[1].total')(model);
  await new WaitForEvent(lineTotalExpression, 'changed').wait(emptyFunction);

  const changed = await new WaitForEvent(lineTotalExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.orders[0].lines[1].total = 35;
  });

  console.log('array member emitted:', changed === lineTotalExpression); // true
  console.log('line total:', lineTotalExpression.value); // 35
`;

const memberArrayPlaygroundScript = dedent`
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const emptyFunction = () => {};

  const model = {
    orders: [
      {
        lines: [
          { sku: 'A', total: 10 },
          { sku: 'B', total: 20 },
        ],
      },
    ],
  };

  const lineTotalExpression = rsx('orders[0].lines[1].total')(model);
  await new WaitForEvent(lineTotalExpression, 'changed').wait(emptyFunction);

  const changed = await new WaitForEvent(lineTotalExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.orders[0].lines[1].total = 35;
  });

  console.log('array member emitted:', changed === lineTotalExpression); // true
  console.log('line total:', lineTotalExpression.value); // 35

  return lineTotalExpression;
`;

const memberMapExampleCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    prices: new Map([
      ['basic', { net: 10, tax: 2 }],
      ['pro', { net: 20, tax: 4 }],
    ]),
  };

  const proNetExpression = rsx<number>('prices["pro"].net')(model);
  await new WaitForEvent(proNetExpression, 'changed').wait(emptyFunction);

  const changed = await new WaitForEvent(proNetExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.prices.set('pro', { net: 30, tax: 6 });
  });

  console.log('map member emitted:', changed === proNetExpression); // true
  console.log('pro net:', proNetExpression.value); // 30
`;

const memberMapPlaygroundScript = dedent`
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const emptyFunction = () => {};

  const model = {
    prices: new Map([
      ['basic', { net: 10, tax: 2 }],
      ['pro', { net: 20, tax: 4 }],
    ]),
  };

  const proNetExpression = rsx('prices["pro"].net')(model);
  await new WaitForEvent(proNetExpression, 'changed').wait(emptyFunction);

  const changed = await new WaitForEvent(proNetExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.prices.set('pro', { net: 30, tax: 6 });
  });

  console.log('map member emitted:', changed === proNetExpression); // true
  console.log('pro net:', proNetExpression.value); // 30

  return proNetExpression;
`;

const memberSetExampleCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const taskA = { id: 'A', done: false };
  const taskB = { id: 'B', done: false };

  const model = {
    trackedTask: taskA,
    tasks: new Set([taskA, taskB]),
  };

  const trackedTaskDoneExpression = rsx<boolean>('tasks[trackedTask].done')(model);
  await new WaitForEvent(trackedTaskDoneExpression, 'changed').wait(emptyFunction);

  const changed = await new WaitForEvent(trackedTaskDoneExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    taskA.done = true;
  });

  console.log(
    'set member emitted:',
    changed === trackedTaskDoneExpression,
  ); // true
  console.log('tracked task done:', trackedTaskDoneExpression.value); // true
`;

const memberSetPlaygroundScript = dedent`
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const emptyFunction = () => {};

  const taskA = { id: 'A', done: false };
  const taskB = { id: 'B', done: false };

  const model = {
    trackedTask: taskA,
    tasks: new Set([taskA, taskB]),
  };

  const trackedTaskDoneExpression = rsx('tasks[trackedTask].done')(model);
  await new WaitForEvent(trackedTaskDoneExpression, 'changed').wait(emptyFunction);

  const changed = await new WaitForEvent(trackedTaskDoneExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    taskA.done = true;
  });

  console.log(
    'set member emitted:',
    changed === trackedTaskDoneExpression,
  ); // true
  console.log('tracked task done:', trackedTaskDoneExpression.value); // true

  return trackedTaskDoneExpression;
`;

const memberNestedPromiseExampleCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    x: Promise.resolve({
      y: Promise.resolve(20),
    }),
  };

  const nestedPromiseExpression = rsx<number>('x.y')(model);
  await new WaitForEvent(nestedPromiseExpression, 'changed').wait(emptyFunction);

  const changed = await new WaitForEvent(nestedPromiseExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.x = Promise.resolve({
      y: Promise.resolve(45),
    });
  });

  console.log('nested promise emitted:', changed === nestedPromiseExpression); // true
  console.log('value:', nestedPromiseExpression.value); // 45
`;

const memberNestedPromisePlaygroundScript = dedent`
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const emptyFunction = () => {};

  const model = {
    x: Promise.resolve({
      y: Promise.resolve(20),
    }),
  };

  const nestedPromiseExpression = rsx('x.y')(model);
  await new WaitForEvent(nestedPromiseExpression, 'changed').wait(emptyFunction);

  const changed = await new WaitForEvent(nestedPromiseExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.x = Promise.resolve({
      y: Promise.resolve(45),
    });
  });

  console.log('nested promise emitted:', changed === nestedPromiseExpression); // true
  console.log('value:', nestedPromiseExpression.value); // 45

  return nestedPromiseExpression;
`;

const memberNestedObservableExampleCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';
  import { BehaviorSubject } from 'rxjs';

  await InjectionContainer.load(RsXExpressionParserModule);

  const x$ = new BehaviorSubject({
    y: new BehaviorSubject(20),
  });

  const model = {
    x: x$,
  };

  const nestedObservableExpression = rsx<number>('x.y')(model);
  await new WaitForEvent(nestedObservableExpression, 'changed').wait(emptyFunction);

  const changed = await new WaitForEvent(nestedObservableExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    x$.next({
      y: new BehaviorSubject(55),
    });
  });

  console.log(
    'nested observable emitted:',
    changed === nestedObservableExpression,
  ); // true
  console.log('value:', nestedObservableExpression.value); // 55
`;

const memberNestedObservablePlaygroundScript = dedent`
  const $ = api.rxjs;
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const emptyFunction = () => {};

  const x$ = new $.BehaviorSubject({
    y: new $.BehaviorSubject(20),
  });

  const model = {
    x: x$,
  };

  const nestedObservableExpression = rsx('x.y')(model);
  await new WaitForEvent(nestedObservableExpression, 'changed').wait(emptyFunction);

  const changed = await new WaitForEvent(nestedObservableExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    x$.next({
      y: new $.BehaviorSubject(55),
    });
  });

  console.log(
    'nested observable emitted:',
    changed === nestedObservableExpression,
  ); // true
  console.log('value:', nestedObservableExpression.value); // 55

  return nestedObservableExpression;
`;

const readonlyPropertiesExampleCode = dedent`
  import { InjectionContainer, printValue } from '@rs-x/core';
  import {
    rsx,
    RsXExpressionParserModule,
    type IExpression,
  } from '@rs-x/expression-parser';
  import {
    type IStateChange,
    type IStateManager,
    RsXStateManagerInjectionTokens,
  } from '@rs-x/state-manager';

  await InjectionContainer.load(RsXExpressionParserModule);

  const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager,
  );

  class MyModel {
    private readonly _aPlusBId = 'aPlusB';
    private _a = 10;
    private _b = 20;

    constructor() {
      this.setAPlusB();
    }

    public dispose(): void {
      return stateManager.releaseState(this, this._aPlusBId);
    }

    public get aPlusB(): number {
      return stateManager.getState(this, this._aPlusBId);
    }

    public get a(): number {
      return this._a;
    }

    public set a(value: number) {
      this._a = value;
      this.setAPlusB();
    }

    public get b(): number {
      return this._b;
    }

    public set b(value: number) {
      this._b = value;
      this.setAPlusB();
    }

    private setAPlusB(): void {
      stateManager.setState(this, this._aPlusBId, this._a + this._b);
    }
  }

  const model = new MyModel();
  const readonlyExpression = rsx<number>('aPlusB')(model);

  const expressionChangeSubscription = readonlyExpression.changed.subscribe(() => {
    console.log('readonly expression value:', readonlyExpression.value);
  });

  const stateChangeSubscription = stateManager.changed.subscribe(
    (change: IStateChange) => {
      if (change.context === model && change.index === 'aPlusB') {
        printValue(change.newValue);
      }
    },
  );

  const randomInt = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const aInterval = setInterval(() => {
    model.a = randomInt(10, 180);
  }, 1200);

  const bInterval = setInterval(() => {
    model.b = randomInt(10, 180);
  }, 1700);

  const originalDispose = readonlyExpression.dispose.bind(readonlyExpression);
  let disposed = false;
  readonlyExpression.dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    clearInterval(aInterval);
    clearInterval(bInterval);
    expressionChangeSubscription.unsubscribe();
    stateChangeSubscription.unsubscribe();
    model.dispose();
    originalDispose();
  };

  export const run: IExpression<number> = readonlyExpression;
`;

const readonlyPropertiesPlaygroundScript = dedent`
  const rsx = api.rsx;
  const stateManager = api.stateManager;
  const printValue = api.printValue;

  class MyModel {
    _aPlusBId = 'aPlusB';
    _a = 10;
    _b = 20;

    constructor() {
      this.setAPlusB();
    }

    dispose() {
      stateManager.releaseState(this, this._aPlusBId);
    }

    get aPlusB() {
      return stateManager.getState(this, this._aPlusBId);
    }

    get a() {
      return this._a;
    }

    set a(value) {
      this._a = value;
      this.setAPlusB();
    }

    get b() {
      return this._b;
    }

    set b(value) {
      this._b = value;
      this.setAPlusB();
    }

    setAPlusB() {
      stateManager.setState(this, this._aPlusBId, this._a + this._b);
    }
  }

  const model = new MyModel();
  const readonlyExpression = rsx('aPlusB')(model);

  const expressionChangeSubscription = readonlyExpression.changed.subscribe(() => {
    console.log('readonly expression value:', readonlyExpression.value);
  });

  const stateChangeSubscription = stateManager.changed.subscribe((change) => {
    if (change.context === model && change.index === 'aPlusB') {
      printValue(change.newValue);
    }
  });

  const randomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const aInterval = setInterval(() => {
    model.a = randomInt(10, 180);
  }, 1200);

  const bInterval = setInterval(() => {
    model.b = randomInt(10, 180);
  }, 1700);

  const originalDispose = readonlyExpression.dispose.bind(readonlyExpression);
  let disposed = false;
  readonlyExpression.dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    clearInterval(aInterval);
    clearInterval(bInterval);
    expressionChangeSubscription.unsubscribe();
    stateChangeSubscription.unsubscribe();
    model.dispose();
    originalDispose();
  };

  return readonlyExpression;
`;

const dependencyInjectionExampleCode = dedent`
  import {
    ContainerModule,
    Inject,
    Injectable,
    InjectionContainer,
    type IError,
    type IErrorLog,
    printValue,
    RsXCoreInjectionTokens,
  } from '@rs-x/core';
  import {
    type IStateChange,
    type IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule,
  } from '@rs-x/state-manager';
  import { Observable, Subject } from 'rxjs';

  @Injectable()
  class PrefixedErrorLog implements IErrorLog {
    private readonly _error = new Subject<IError>();

    public get error(): Observable<IError> {
      return this._error;
    }

    public add(error: IError): void {
      const message = error.message ?? 'Unknown error';
      const next: IError = {
        ...error,
        message: '[custom-log] ' + message,
      };
      console.error(next);
      this._error.next(next);
    }

    public clear(): void {
      console.clear();
    }
  }

  @Injectable()
  class CounterService {
    constructor(
      @Inject(RsXStateManagerInjectionTokens.IStateManager)
      private readonly _stateManager: IStateManager,
      @Inject(RsXCoreInjectionTokens.IErrorLog)
      private readonly _errorLog: IErrorLog,
    ) {}

    public increment(model: { count: number }): void {
      if (model.count < 0) {
        this._errorLog.add({
          context: model,
          message: 'count cannot be negative',
        });
        return;
      }

      const next = model.count + 1;
      this._stateManager.setState(model, 'count', next);
      model.count = next;
    }
  }

  const CustomRuntimeModule = new ContainerModule((options) => {
    if (options.isBound(RsXCoreInjectionTokens.IErrorLog)) {
      options.unbind(RsXCoreInjectionTokens.IErrorLog);
    }

    options
      .bind<IErrorLog>(RsXCoreInjectionTokens.IErrorLog)
      .to(PrefixedErrorLog)
      .inSingletonScope();
    options.bind<CounterService>(CounterService).toSelf().inSingletonScope();
  });

  await InjectionContainer.load(RsXStateManagerModule);
  await InjectionContainer.load(CustomRuntimeModule);

  const stateManager = InjectionContainer.get<IStateManager>(
    RsXStateManagerInjectionTokens.IStateManager,
  );
  const errorLog = InjectionContainer.get<IErrorLog>(
    RsXCoreInjectionTokens.IErrorLog,
  );
  const counterService = InjectionContainer.get(CounterService);

  const model = { count: 0 };

  const stateSubscription = stateManager.changed.subscribe((change: IStateChange) => {
    if (change.context === model && change.index === 'count') {
      printValue(change.newValue);
    }
  });

  const errorSubscription = errorLog.error.subscribe((error) => {
    console.log('error:', error.message);
  });

  counterService.increment(model); // 1
  counterService.increment(model); // 2
  model.count = -1;
  counterService.increment(model); // custom error log emits

  stateSubscription.unsubscribe();
  errorSubscription.unsubscribe();
`;

const CORE_CONCEPT_DOCS: CoreConceptDoc[] = [
  {
    slug: 'modular-expressions',
    title: 'Modular expressions',
    lead: 'Split one large expression into reusable sub-expressions, then compose them into a final result that stays reactive.',
    whatItMeans:
      'In rs-x, expressions can reference other expressions as first-class values. Instead of one monolithic formula string, you define focused building blocks and compose them into a higher-level expression.',
    whyItMatters:
      'This makes expression logic easier to read, debug, and test. It also improves runtime efficiency because shared sub-expressions are reused instead of recalculated in multiple places.',
    keyPoints: [
      'Sub-expressions stay observable, so changes propagate through the graph automatically.',
      'Shared logic is evaluated once and reused by dependents.',
      'Works with synchronous and asynchronous values (observables/promises).',
      'You can move from long formulas to maintainable expression modules without changing reactive behavior.',
    ],
    deepDive: [
      {
        title: 'From monolithic formula to reusable modules',
        paragraphs: [
          'A large formula often duplicates parts of the same calculation, which hurts readability and performance. In the credit-risk example, the risk score logic appears multiple times in one expression string.',
          'With modular expressions, that same logic is split into smaller units. Each unit has one responsibility, and a final expression combines them. This removes duplication and makes each piece independently understandable.',
        ],
      },
      {
        title: 'Reactive behavior across expression boundaries',
        paragraphs: [
          'When a sub-expression changes, dependent expressions update automatically. You do not need custom plumbing code to keep derived values in sync.',
          'Because each expression is observable, the dependency graph remains explicit and predictable, even when modules are nested.',
        ],
      },
      {
        title: 'Performance and maintainability benefits',
        paragraphs: [
          'Expression parser services cache parse/evaluation structures, and modular design avoids repeated heavy computation.',
          'As rules grow, modular expressions let you evolve one part at a time while keeping the full formula behavior stable.',
        ],
      },
    ],
    exampleCode: dedent`
      import { InjectionContainer } from '@rs-x/core';
      import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

      await InjectionContainer.load(RsXExpressionParserModule);

      const model = {
        customer: {
          age: 31,
          income: 52000,
          employmentYears: 4,
        },
        credit: {
          score: 640,
          outstandingDebt: 12000,
        },
        riskParameters: {
          market: { baseInterestRate: 0.04 },
          risk: { volatilityIndex: 0.22, recessionProbability: 0.18 },
        },
      };

      // Sub-expressions
      const basePersonalRisk = rsx<number>(
        '(credit.score < 600 ? 0.4 : 0.1) + (credit.outstandingDebt / customer.income) * 0.6 - customer.employmentYears * 0.03',
      )(model);

      const ageBasedRiskAdjustment = rsx<number>(
        'customer.age < 25 ? 0.15 : customer.age < 35 ? 0.05 : customer.age < 55 ? 0.0 : 0.08',
      )(model);

      const marketRisk = rsx<number>(
        '(riskParameters.risk.volatilityIndex * 0.5) + (riskParameters.risk.recessionProbability * 0.5)',
      )(model);

      const interestRateImpact = rsx<number>(
        'riskParameters.market.baseInterestRate * 2',
      )(model);

      // Compose reusable modules
      const riskScore = rsx<number>(
        'basePersonalRisk + ageBasedRiskAdjustment + marketRisk + interestRateImpact',
      )({
        basePersonalRisk,
        ageBasedRiskAdjustment,
        marketRisk,
        interestRateImpact,
      });

      // Final classification
      const riskClassification = rsx<'HIGH' | 'MEDIUM' | 'LOW'>(
        "riskScore >= thresholds.highRisk ? 'HIGH' : riskScore >= thresholds.mediumRisk ? 'MEDIUM' : 'LOW'",
      )({
        riskScore,
        thresholds: { highRisk: 0.75, mediumRisk: 0.45 },
      });

      const randomBetween = (min: number, max: number): number =>
        min + Math.random() * (max - min);

      const randomInt = (min: number, max: number): number =>
        Math.floor(randomBetween(min, max + 1));

      let emphasizeHighRisk = false;
      const applyRandomScenario = () => {
        emphasizeHighRisk = !emphasizeHighRisk;

        if (emphasizeHighRisk) {
          // Push model toward HIGH risk.
          model.credit.score = randomInt(450, 580);
          model.credit.outstandingDebt = randomInt(25000, 60000);
          model.customer.income = randomInt(28000, 52000);
          model.customer.employmentYears = randomInt(0, 2);
          model.customer.age = randomInt(20, 28);
          model.riskParameters.risk.volatilityIndex = randomBetween(0.55, 0.95);
          model.riskParameters.risk.recessionProbability = randomBetween(0.45, 0.9);
          model.riskParameters.market.baseInterestRate = randomBetween(0.06, 0.13);
        } else {
          // Push model toward MEDIUM/LOW risk.
          model.credit.score = randomInt(680, 820);
          model.credit.outstandingDebt = randomInt(1000, 14000);
          model.customer.income = randomInt(65000, 130000);
          model.customer.employmentYears = randomInt(5, 25);
          model.customer.age = randomInt(30, 58);
          model.riskParameters.risk.volatilityIndex = randomBetween(0.05, 0.25);
          model.riskParameters.risk.recessionProbability = randomBetween(0.03, 0.2);
          model.riskParameters.market.baseInterestRate = randomBetween(0.01, 0.05);
        }
      };

      const classificationChangedSubscription = riskClassification.changed.subscribe(() => {
        console.log(
          'Risk score:',
          Number(riskScore.value).toFixed(3),
          'Classification:',
          riskClassification.value,
        );
      });

      // Keep changing inputs so classification flips over time.
      applyRandomScenario();
      const scenarioInterval = setInterval(() => {
        applyRandomScenario();
      }, 2500);

      const originalDispose = riskClassification.dispose.bind(riskClassification);
      let disposed = false;
      riskClassification.dispose = () => {
        if (disposed) {
          return;
        }
        disposed = true;
        clearInterval(scenarioInterval);
        classificationChangedSubscription.unsubscribe();
        originalDispose();
      };

      return riskClassification;
    `,
    playgroundScript: dedent`
      const rsx = api.rsx;

      const model = {
        customer: {
          age: 31,
          income: 52000,
          employmentYears: 4,
        },
        credit: {
          score: 640,
          outstandingDebt: 12000,
        },
        riskParameters: {
          market: { baseInterestRate: 0.04 },
          risk: { volatilityIndex: 0.22, recessionProbability: 0.18 },
        },
      };

      const basePersonalRisk = rsx(
        '(credit.score < 600 ? 0.4 : 0.1) + (credit.outstandingDebt / customer.income) * 0.6 - customer.employmentYears * 0.03',
      )(model);

      const ageBasedRiskAdjustment = rsx(
        'customer.age < 25 ? 0.15 : customer.age < 35 ? 0.05 : customer.age < 55 ? 0.0 : 0.08',
      )(model);

      const marketRisk = rsx(
        '(riskParameters.risk.volatilityIndex * 0.5) + (riskParameters.risk.recessionProbability * 0.5)',
      )(model);

      const interestRateImpact = rsx(
        'riskParameters.market.baseInterestRate * 2',
      )(model);

      const riskScore = rsx(
        'basePersonalRisk + ageBasedRiskAdjustment + marketRisk + interestRateImpact',
      )({
        basePersonalRisk,
        ageBasedRiskAdjustment,
        marketRisk,
        interestRateImpact,
      });

      const riskClassification = rsx(
        "riskScore >= thresholds.highRisk ? 'HIGH' : riskScore >= thresholds.mediumRisk ? 'MEDIUM' : 'LOW'",
      )({
        riskScore,
        thresholds: { highRisk: 0.75, mediumRisk: 0.45 },
      });

      const randomBetween = (min, max) => min + Math.random() * (max - min);
      const randomInt = (min, max) => Math.floor(randomBetween(min, max + 1));
      let emphasizeHighRisk = false;

      const applyRandomScenario = () => {
        emphasizeHighRisk = !emphasizeHighRisk;

        if (emphasizeHighRisk) {
          // Push model toward HIGH risk.
          model.credit.score = randomInt(450, 580);
          model.credit.outstandingDebt = randomInt(25000, 60000);
          model.customer.income = randomInt(28000, 52000);
          model.customer.employmentYears = randomInt(0, 2);
          model.customer.age = randomInt(20, 28);
          model.riskParameters.risk.volatilityIndex = randomBetween(0.55, 0.95);
          model.riskParameters.risk.recessionProbability = randomBetween(0.45, 0.9);
          model.riskParameters.market.baseInterestRate = randomBetween(0.06, 0.13);
        } else {
          // Push model toward MEDIUM/LOW risk.
          model.credit.score = randomInt(680, 820);
          model.credit.outstandingDebt = randomInt(1000, 14000);
          model.customer.income = randomInt(65000, 130000);
          model.customer.employmentYears = randomInt(5, 25);
          model.customer.age = randomInt(30, 58);
          model.riskParameters.risk.volatilityIndex = randomBetween(0.05, 0.25);
          model.riskParameters.risk.recessionProbability = randomBetween(0.03, 0.2);
          model.riskParameters.market.baseInterestRate = randomBetween(0.01, 0.05);
        }
      };

      const classificationChangedSubscription = riskClassification.changed.subscribe(() => {
        console.log(
          'Risk score:',
          Number(riskScore.value).toFixed(3),
          'Classification:',
          riskClassification.value,
        );
      });

      // Keep changing inputs so classification flips over time.
      applyRandomScenario();
      const scenarioInterval = setInterval(() => {
        applyRandomScenario();
      }, 2500);

      const originalDispose = riskClassification.dispose.bind(riskClassification);
      let disposed = false;
      riskClassification.dispose = () => {
        if (disposed) {
          return;
        }
        disposed = true;
        clearInterval(scenarioInterval);
        classificationChangedSubscription.unsubscribe();
        originalDispose();
      };

      return riskClassification;
    `,
    related: [
      {
        href: '/docs/iexpression',
        title: 'IExpression',
        meta: 'Runtime expression contract',
      },
      {
        href: '/docs/abstract-expression',
        title: 'AbstractExpression',
        meta: 'Base expression runtime class',
      },
      {
        href: '/docs/expression-change-transaction-manager',
        title: 'Change transaction manager',
        meta: 'Batch/commit update behavior',
      },
    ],
  },
  {
    slug: 'async-operations',
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
  },
  {
    slug: 'collections',
    title: 'Collections',
    lead: 'Array, Map, and Set are reactive in rs-x expressions.',
    whatItMeans:
      'Collection reads and writes are observed so dependent expressions can react when items change.',
    whyItMatters:
      'Collection-heavy models are common. Consistent collection tracking keeps computed values in sync with minimal manual code.',
    keyPoints: [
      'Array/Map/Set mutations can trigger reactive updates.',
      'Track collection item access and membership changes.',
      'Prefer explicit collection operations for predictable updates.',
    ],
    related: [
      {
        href: '/docs/collections',
        title: 'Collections guide',
        meta: 'Non-technical walkthrough with Array/Map/Set examples',
      },
      {
        href: '/docs/observation',
        title: 'Observation strategy',
        meta: 'Collection observer behavior',
      },
      {
        href: '/docs/core-api/module/index-value-accessor',
        title: 'index-value-accessor',
        meta: 'Collection accessors',
      },
    ],
  },
  {
    slug: 'member-expressions',
    title: 'Member expressions',
    lead: 'Member paths are a core part of rs-x: they resolve nested values across objects, arrays, maps, sets, function calls, and async segments.',
    whatItMeans:
      'A member expression is any path-style expression like `order.customer.name`, `prices["pro"]`, `tasks[trackedTask]`, or `x.y` where `x`/`y` may be Promise/Observable-backed values. rs-x resolves each path segment step by step, binds that segment to the correct owner object, and keeps subscriptions aligned as the path changes over time.',
    whyItMatters:
      'Most real models combine plain objects, collections, and async values. Accurate member-path resolution keeps values and change events in sync, while reevaluating only the part of the path affected by a change.',
    keyPoints: [
      'Path evaluation is segment-based and left-to-right, with each segment using the previous segment value as context.',
      'When a segment in the path changes, rs-x rebinds dependent segments in order. For example, with `a.b.c.d`, if `b` is replaced, rs-x first rebinds `c` to the new `b`, then rebinds `d` to the new `c`.',
      'Computed member slots (like `tasks[trackedTask]`) are rebound when their key expression changes, without rebuilding the whole expression tree.',
      'Array/Map/Set members are resolved by dedicated owner resolvers and index accessors, not by ad-hoc branch logic.',
      'Nested Promise/Observable paths are supported and continue automatically when values become available.',
      'Reevaluation clears and recomputes only the affected part of the path.',
    ],
    deepDive: [
      {
        title: 'How a member path is represented and evaluated',
        paragraphs: [
          'The parser flattens member syntax into path segments. For example, `a.b[c].d` becomes ordered segments where computed segments are represented as index expressions. Evaluation then runs segment-by-segment, always carrying forward the previous segment result as the context for the next lookup.',
          'This keeps path semantics explicit. A change in an early segment invalidates only what depends on it, instead of forcing full expression recomputation.',
          'When a segment changes, rs-x rebinds dependent segments in order. For example, with `a.b.c.d`, if `b` is replaced, rs-x first rebinds `c` to the new `b`, then rebinds `d` to the new `c`.',
        ],
      },
      {
        title: 'Bind flow and deferred initialization',
        paragraphs: [
          'During bind, root and calculated segments are bound from the original root context, while non-root path segments wait for the previous segment value. MemberExpression queues late binds with `queueMicrotask` so a bind side effect cannot trigger nested evaluation in the same call stack.',
          'That deferred bind step prevents re-entrancy issues and gives a stable evaluation order, especially for long paths with mixed sync/async segments.',
        ],
      },
      {
        title: 'Dynamic computed slots: prices[key], tasks[trackedTask]',
        paragraphs: [
          'For computed members, rs-x resolves the current index value first, then creates an internal static slot observer for that specific resolved key. If the dynamic key changes later, the previous slot observer is disposed and rebound to the new key.',
          'This rebinding flow is what keeps expressions like `map[currentKey]` or `set[selectedItem]` reactive to both key changes and value/membership changes for the currently selected slot.',
        ],
      },
      {
        title: 'Owner resolution across object, array, map, and set',
        paragraphs: [
          'Identifier owner resolution is delegated to resolver chain services. Property owners, array indexes, set membership keys, and map keys each have explicit resolver logic. That means member paths do not rely on one generic fallback for all container types.',
          'For Set and Map, key identity matters. Paths like `tasks[trackedTask]` and `prices["pro"]` are resolved against membership/keys directly, then the value path continues from that resolved member.',
        ],
      },
      {
        title: 'Async segments in the middle of a member path',
        paragraphs: [
          'Nested async is useful when one async value depends on another async value that must be resolved first.',
          'A common pattern is: fetch A first, then use A to fetch or subscribe to B.',
          'When a segment resolves to a Promise or Observable, rs-x keeps the path in a waiting state until the value is available, then continues the rest of the path automatically.',
          'Nested async paths such as `{ x: Promise.resolve({ y: Promise.resolve(20) }) }` with `x.y`, or Observable equivalents, are handled as normal member paths once each layer becomes available.',
        ],
      },
      {
        title: 'Change propagation and transaction integration',
        paragraphs: [
          'Identifier segments report state changes through IndexValueObserver, then register commits with the transaction manager. MemberExpression `prepareReevaluation` clears only non-calculated path parts after that point that are no longer valid for the new value.',
          'In practice this gives precise updates: only affected tracked paths are reevaluated and committed, which reduces noisy work and keeps emitted changes aligned with the semantic path that changed.',
        ],
      },
    ],
    examples: [
      {
        title: 'Function',
        description:
          'Call a function inside the member path (`cart.first().qty`) and keep property tracking after the function call reactive.',
        code: memberFunctionExampleCode,
        playgroundScript: memberFunctionPlaygroundScript,
      },
      {
        title: 'Function with args',
        description:
          'Call a function with arguments inside the member path (`cart.byId(selectedId).qty`) and react to both argument changes and returned-member updates.',
        code: memberFunctionWithArgsExampleCode,
        playgroundScript: memberFunctionWithArgsPlaygroundScript,
      },
      {
        title: 'Sequence',
        description:
          'Use a sequence expression inside a member path (`(initializeA(), a).b`) to run setup first, then read from the target object.',
        code: memberSequenceExampleCode,
        playgroundScript: memberSequencePlaygroundScript,
      },
      {
        title: 'Array',
        description:
          'Use nested array indexes inside member paths (`orders[0].lines[1].total`) and react to index-targeted updates.',
        code: memberArrayExampleCode,
        playgroundScript: memberArrayPlaygroundScript,
      },
      {
        title: 'Map',
        description:
          'Resolve a map key in the path (`prices["pro"].net`) and react when that key is replaced.',
        code: memberMapExampleCode,
        playgroundScript: memberMapPlaygroundScript,
      },
      {
        title: 'Set',
        description:
          'Resolve a set member by tracked key (`tasks[trackedTask].done`) and observe member property updates.',
        code: memberSetExampleCode,
        playgroundScript: memberSetPlaygroundScript,
      },
      {
        title: 'Nested Promise',
        description:
          'Use nested Promise-backed member paths (`x.y`) where both parent and child segments resolve asynchronously.',
        code: memberNestedPromiseExampleCode,
        playgroundScript: memberNestedPromisePlaygroundScript,
      },
      {
        title: 'Nested Observable',
        description:
          'Use nested Observable-backed member paths (`x.y`) and react when upstream emits a new nested observable value.',
        code: memberNestedObservableExampleCode,
        playgroundScript: memberNestedObservablePlaygroundScript,
      },
    ],
    related: [
      {
        href: '/docs/collections',
        title: 'Collections guide',
        meta: 'Member behavior for array/map/set paths',
      },
      {
        href: '/docs/abstract-expression',
        title: 'AbstractExpression',
        meta: 'Expression node behavior',
      },
      {
        href: '/docs/async-operations',
        title: 'Advanced: Async operations',
        meta: 'Promise/Observable resolution internals',
      },
      {
        href: '/docs/expression-type',
        title: 'ExpressionType',
        meta: 'Expression node types',
      },
    ],
  },
  {
    slug: 'dependency-injection',
    title: 'Dependency injection',
    lead: 'Compose runtime modules and adapt services without changing business expression code.',
    whatItMeans:
      'RS-X is designed to be adaptable. To accomplish that it uses the composition pattern so services can be extended or adapted through dependency injection. The current dependency-injection implementation is based on Inversify and exposed through `InjectionContainer`.',
    whyItMatters:
      'You can replace or extend runtime behavior at composition boundaries instead of editing core logic. This keeps app code stable while letting infrastructure concerns like logging, equality, observers, and metadata evolve independently.',
    keyPoints: [
      'RS-X runtime modules are container modules that register implementations under contract identifiers (tokens).',
      'Services are resolved by token, so consumers depend on interfaces/contracts rather than concrete classes.',
      'You can add or replace services by loading your own module after the base module.',
      'Multi-service pipelines use list registration helpers for ordered extension points.',
      'This keeps runtime customization explicit, testable, and easy to reason about.',
    ],
    deepDive: [
      {
        title: 'How composition and DI work together',
        paragraphs: [
          'Composition in RS-X means each subsystem exposes clear extension points (tokens, module bindings, and service lists) instead of hard-coding dependencies inside feature logic.',
          'Dependency injection wires those extension points at startup. Business code consumes stable contracts, while implementations stay swappable.',
          'In practice this lets you adapt runtime behavior per app or environment without forking RS-X internals.',
        ],
      },
      {
        title: 'rs-x uses Inversify',
        paragraphs: [
          'rs-x uses Inversify as its dependency injection implementation.',
          'The core container API (`Container`, `ContainerModule`, `Inject`, `Injectable`, `MultiInject`) is re-exported from `@rs-x/core`, so rs-x modules and your app modules use one DI style.',
          '`InjectionContainer` is the shared runtime container instance. Module load order defines how bindings are composed and when overrides are applied.',
          'This design keeps DI mechanics centralized while still allowing package-level modules (`@rs-x/core`, `@rs-x/state-manager`, `@rs-x/expression-parser`) to remain independently maintainable.',
        ],
      },
      {
        title: 'Two extension patterns you will use most',
        paragraphs: [
          'Single-service override: unbind a token and rebind it to your implementation (for example custom `IErrorLog` or custom equality behavior).',
          'Multi-service extension: register ordered service lists (for accessors, observers, metadata) with `registerMultiInjectServices` or replace list order with `overrideMultiInjectServices`.',
          'Together these cover most adaptation cases: behavior replacement and ordered pipeline composition.',
        ],
      },
      {
        title: 'Common DI mistakes to avoid',
        paragraphs: [
          'Rebinding a token without unbinding first can leave multiple active bindings and produce unexpected resolution behavior.',
          'Changing a broad multi-service list can affect unrelated runtime behavior. Prefer small, explicit list changes and verify service order.',
          'Because `InjectionContainer` is shared, bindings can leak between test runs or hot-reload sessions if modules are not unloaded.',
        ],
      },
    ],
    exampleCode: dependencyInjectionExampleCode,
    related: [
      {
        href: '/docs/core-api/module/dependency-injection',
        title: 'dependency-injection module',
        meta: 'Container, decorators, and DI helper APIs',
      },
      {
        href: '/docs/core-api/InjectionContainer',
        title: 'InjectionContainer',
        meta: 'Shared container used by runtime modules',
      },
      {
        href: '/docs/core-api/registerMultiInjectServices',
        title: 'registerMultiInjectServices',
        meta: 'Register ordered service lists',
      },
      {
        href: '/docs/core-api/overrideMultiInjectServices',
        title: 'overrideMultiInjectServices',
        meta: 'Replace and reorder multi-injected lists',
      },
    ],
  },
  {
    slug: 'readonly-properties',
    title: 'Readonly properties',
    lead: 'Expose a readonly property while still keeping it reactive through explicit state updates.',
    whatItMeans:
      'A readonly property should not be written from the outside, but it can still change when underlying writable fields change. In this pattern, you store the readonly value in StateManager under an internal id, then read it through a getter.',
    whyItMatters:
      'This keeps your model API safe and clear: consumers can read `aPlusB`, but only model logic can update it. You get immutable-looking API boundaries without losing reactive updates and change events.',
    keyPoints: [
      'Use a private state id (for example `_aPlusBId = "aPlusB"`) to store readonly computed state.',
      'Expose the readonly property via a getter that reads from `stateManager.getState(this, id)`.',
      'Recompute and write the value internally with `stateManager.setState(...)` when source fields change.',
      'Subscribe to `stateManager.changed` if you need to observe emitted updates.',
      'Always call `releaseState(...)` when the model instance is no longer needed.',
    ],
    deepDive: [
      {
        title: 'How the pattern works',
        paragraphs: [
          'In the example, `aPlusB` is readonly for callers because it only has a getter. Internally, the model stores that value in StateManager using a private key (`_aPlusBId`).',
          'Whenever `a` or `b` changes, `setAPlusB()` recomputes the new value and writes it through `stateManager.setState(this, _aPlusBId, ...)`.',
        ],
      },
      {
        title: 'Why this is still reactive',
        paragraphs: [
          'The readonly getter returns `stateManager.getState(this, _aPlusBId)`, so reads always use the latest committed value.',
          'Because updates go through StateManager, `changed` emissions are produced for the readonly value key, so subscribers can react just like with normal writable state.',
        ],
      },
      {
        title: 'Ownership and cleanup',
        paragraphs: [
          'This pattern makes ownership explicit: only the model is allowed to mutate the readonly result, through one internal method.',
          'When the model is disposed, release the registered state id. This prevents stale watches and keeps memory/subscriptions clean.',
        ],
      },
      {
        title: 'When to use this approach',
        paragraphs: [
          'Use it when a value should be public and reactive, but never directly assignable by consumers (for example totals, derived status flags, validation summaries, or normalized snapshots).',
          'It is a good fit for domain models where you want strict write control and predictable change propagation.',
        ],
      },
    ],
    exampleCode: readonlyPropertiesExampleCode,
    playgroundScript: readonlyPropertiesPlaygroundScript,
    related: [
      {
        href: '/docs/state-manager-api/StateManager',
        title: 'StateManager API',
        meta: 'Watch, set, get, and release state',
      },
      {
        href: '/docs/state-manager-api/IStateManager',
        title: 'IStateManager API',
        meta: 'State manager contract used in this pattern',
      },
      {
        href: '/docs/expression-change-transaction-manager',
        title: 'Change transaction manager',
        meta: 'Write/commit lifecycle',
      },
      {
        href: '/docs/core-api/module/exceptions',
        title: 'exceptions',
        meta: 'Validation and error behavior',
      },
    ],
  },
  {
    slug: 'batching-transactions',
    title: 'Batching changes',
    lead: 'Group multiple model updates and emit one final expression change.',
    whatItMeans:
      'rs-x collects updates first and publishes the final value at the end of a change cycle. You can pause publishing with suspend() and release all pending work with continue().',
    whyItMatters:
      'This keeps change events predictable: fewer noisy intermediate values, less duplicate work, and clearer logs for subscribers.',
    keyPoints: [
      'One completed cycle usually produces one final changed event per root expression.',
      'Back-to-back writes in the same synchronous block can already collapse into one emission, even without suspend().',
      'Use suspend() and continue() when updates happen over multiple async steps but should still notify once.',
      'Use normal updates when intermediate values are meaningful for your flow.',
      'changed is only emitted when the final value is actually different.',
    ],
    deepDive: [
      {
        title: 'What this example proves',
        paragraphs: [
          'The example intentionally flushes between unbatched writes, so each write gets its own commit and you can see multiple emissions.',
          'In the batched part, the same writes run while suspended. continue() then flushes once, so subscribers see one final emission.',
        ],
      },
      {
        title: 'Why unbatched can still look like one emission',
        paragraphs: [
          'If several writes happen immediately after each other in one synchronous turn, rs-x can still publish one final value.',
          'That is expected behavior. It means the system coalesced those writes before the commit boundary.',
        ],
      },
      {
        title: 'When to use suspend and continue',
        paragraphs: [
          'Use it for multi-step updates where partial states should stay private until everything is ready.',
          'Typical cases are import pipelines, validation-and-fix passes, or grouped recalculations where you only care about the final result.',
        ],
      },
    ],
    exampleCode: batchingTransactionsExampleCode,
    playgroundScript: batchingTransactionsPlaygroundScript,
    related: [
      {
        href: '/docs/expression-change-transaction-manager',
        title: 'Change transaction manager',
        meta: 'Batch and commit changes',
      },
      {
        href: '/docs/expression-change-commit-handler',
        title: 'Commit handler',
        meta: 'Commit execution behavior',
      },
    ],
  },
  {
    slug: 'caching-and-identity',
    title: 'Caching and identity',
    lead: 'Use stable ids and cache entries to reuse runtime state safely.',
    whatItMeans:
      'Factory and id services assign and track ids so repeated access can reuse existing entries instead of recreating them.',
    whyItMatters:
      'Stable identity reduces duplication, improves performance, and prevents memory churn.',
    keyPoints: [
      'Reuse cached entries when id and context match.',
      'Manage lifecycle with reference counting/dispose where required.',
      'Keep id generation stable for equivalent inputs.',
    ],
    related: [
      {
        href: '/docs/core-api/KeyedInstanceFactory',
        title: 'KeyedInstanceFactory',
        meta: 'Id-keyed instance lifecycle base',
      },
      {
        href: '/docs/core-api/module/sequence-id',
        title: 'sequence-id',
        meta: 'Stable id generation services',
      },
    ],
  },
];

type PageProps = {
  params: Promise<{ topic: string }>;
};

function bySlug(slug: string): CoreConceptDoc | undefined {
  return CORE_CONCEPT_DOCS.find((item) => item.slug === slug);
}

function toExampleTabValue(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function generateStaticParams() {
  return CORE_CONCEPT_DOCS.map((item) => ({ topic: item.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { topic } = await params;
  const item = bySlug(topic);
  if (!item) {
    return { title: 'Core concepts' };
  }
  return {
    title: item.title,
    description: item.lead,
  };
}

export default async function CoreConceptTopicPage({ params }: PageProps) {
  const { topic } = await params;
  const item = bySlug(topic);
  if (!item) {
    notFound();
  }
  const tryInPlaygroundHref = item.playgroundScript
    ? toPlaygroundHref(item.playgroundScript)
    : null;
  const memberExpressionTabs =
    item.slug === 'member-expressions'
      ? (item.examples ?? []).map((example) => ({
          value: toExampleTabValue(example.title),
          label: example.title,
          description: example.description,
          code: example.code,
          playgroundHref: example.playgroundScript
            ? toPlaygroundHref(example.playgroundScript)
            : undefined,
        }))
      : [];

  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'Core concepts', href: '/docs' },
              { label: item.title },
            ]}
          />
          <p className="docsApiEyebrow">Core Concepts</p>
          <h1 className="sectionTitle">{item.title}</h1>
          <p className="sectionLead">{item.lead}</p>
          {item.slug === 'modular-expressions' && (
            <p className="cardText">
              See how modular expressions are implemented in the{' '}
              <Link href="/docs/modular-expressions">
                advanced modular expressions page
              </Link>
              .
            </p>
          )}
          {item.slug === 'async-operations' && (
            <p className="cardText">
              For runtime internals, see the{' '}
              <Link href="/docs/async-operations">
                advanced async operations page
              </Link>
              .
            </p>
          )}
          {item.slug === 'collections' && (
            <p className="cardText">
              For practical examples (including specific-item monitoring), see
              the <Link href="/docs/collections">collections guide</Link>.
            </p>
          )}
        </div>
      </div>

      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">What it means</h2>
          {item.slug === 'dependency-injection' ? (
            <p className="cardText">
              RS-X is designed to be adaptable. To accomplish that it uses the
              composition pattern so services can be extended or adapted through
              dependency injection. The current dependency-injection
              implementation is based on{' '}
              <a href="https://inversify.io/" target="_blank" rel="noreferrer">
                Inversify
              </a>{' '}
              and exposed through{' '}
              <Link href="/docs/core-api/InjectionContainer">
                <span className="codeInline">InjectionContainer</span>
              </Link>
              .
            </p>
          ) : (
            <p className="cardText">{item.whatItMeans}</p>
          )}
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Practical value</h2>
          <p className="cardText">{item.whyItMatters}</p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Key points</h2>
          <ul className="advancedTopicLinks">
            {item.keyPoints.map((point) => (
              <li key={point}>
                {point}
                {item.slug === 'async-operations' &&
                  point ===
                    'rs-x is pluggable, so you can add support for custom async entities.' && (
                    <>
                      {' '}
                      See for example the{' '}
                      <Link href="/docs/modular-expressions">
                        modular expression implementation
                      </Link>
                      .
                    </>
                  )}
              </li>
            ))}
          </ul>
        </article>

        {item.deepDive?.map((section) => (
          <article key={section.title} className="card docsApiCard">
            <h2 className="cardTitle">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="cardText">
                {paragraph}
              </p>
            ))}
          </article>
        ))}

        {item.exampleCode && (
          <article className="card docsApiCard">
            <h2 className="cardTitle">Example</h2>
            {tryInPlaygroundHref ? (
              <div className="cardLinks">
                <Link className="cardLink" href={tryInPlaygroundHref}>
                  Try in playground <span aria-hidden="true">→</span>
                </Link>
              </div>
            ) : null}
            <SyntaxCodeBlock code={item.exampleCode} />
          </article>
        )}

        {item.slug === 'member-expressions' &&
        memberExpressionTabs.length > 0 ? (
          <MemberExpressionExamplesTabs tabs={memberExpressionTabs} />
        ) : (
          item.examples?.map((example) => (
            <article key={example.title} className="card docsApiCard">
              <h2 className="cardTitle">{example.title} example</h2>
              <p className="cardText">{example.description}</p>
              {example.playgroundScript ? (
                <div className="cardLinks">
                  <Link
                    className="cardLink"
                    href={toPlaygroundHref(example.playgroundScript)}
                  >
                    Try in playground <span aria-hidden="true">→</span>
                  </Link>
                </div>
              ) : null}
              <SyntaxCodeBlock code={example.code} />
            </article>
          ))
        )}

        <article className="card docsApiCard">
          <h2 className="cardTitle">Related docs</h2>
          <ul className="docsApiLinkGrid">
            {item.related.map((link) => (
              <li key={link.href}>
                <Link className="docsApiLinkItem" href={link.href}>
                  <ItemLinkCardContent title={link.title} meta={link.meta} />
                </Link>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </DocsPageTemplate>
  );
}
