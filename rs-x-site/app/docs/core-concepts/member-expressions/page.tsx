import dedent from 'dedent';
import type { Metadata } from 'next';

import {
  CoreConceptPageLayout,
  toPlaygroundHref,
  type CoreConceptDoc,
} from '../_template/core-concept-page';
import { MemberExpressionExamplesTabs } from './member-expression-examples-tabs.client';

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

const doc: CoreConceptDoc = {
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
};

function toExampleTabValue(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const metadata: Metadata = {
  title: doc.title,
  description: doc.lead,
};

export default function Page() {
  const memberExpressionTabs = (doc.examples ?? []).map((example) => ({
    value: toExampleTabValue(example.title),
    label: example.title,
    description: example.description,
    code: example.code,
    playgroundHref: example.playgroundScript
      ? toPlaygroundHref(example.playgroundScript)
      : undefined,
  }));

  return (
    <CoreConceptPageLayout
      doc={doc}
      examplesSlot={<MemberExpressionExamplesTabs tabs={memberExpressionTabs} />}
    />
  );
}
