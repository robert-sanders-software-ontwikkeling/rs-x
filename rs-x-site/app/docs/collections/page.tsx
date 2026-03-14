import dedent from 'dedent';
import Link from 'next/link';

import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';

import { CollectionExamplesTabs } from './collection-examples-tabs.client';

type CollectionExample = {
  title: string;
  description: string;
  code: string;
  playgroundScript: string;
};

const toPlaygroundHref = (script: string): string =>
  `/playground?data=${encodeURIComponent(`plain:${encodeURIComponent(script)}`)}`;

const arrayCollectionCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    cart: [{ id: 'A', qty: 1 }],
  };

  // Watch the whole collection
  const cartExpression = rsx('cart')(model);
  await new WaitForEvent(cartExpression, 'changed').wait(emptyFunction);

  const pushChange = await new WaitForEvent(cartExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.cart.push({ id: 'B', qty: 2 });
  });

  console.log('array push emitted:', pushChange === cartExpression); // true
`;

const arrayCollectionPlaygroundScript = dedent`
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const emptyFunction = () => {};

  const model = {
    cart: [{ id: 'A', qty: 1 }],
  };

  // Watch the whole collection
  const cartExpression = rsx('cart')(model);
    await new WaitForEvent(cartExpression, 'changed').wait(emptyFunction);

    const pushChange = await new WaitForEvent(cartExpression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.cart.push({ id: 'B', qty: 2 });
    });

    console.log('array push emitted:', pushChange === cartExpression); // true

  return cartExpression;
`;

const mapCollectionCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    prices: new Map([['basic', 10]]),
  };

  // Watch the whole collection
  const pricesExpression = rsx('prices')(model);
  await new WaitForEvent(pricesExpression, 'changed').wait(emptyFunction);

  const setChange = await new WaitForEvent(pricesExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.prices.set('premium', 20);
  });

  console.log('map set emitted:', setChange === pricesExpression); // true
`;

const mapCollectionPlaygroundScript = dedent`
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const emptyFunction = () => {};

  const model = {
    prices: new Map([['basic', 10]]),
  };

  // Watch the whole collection
  const pricesExpression = rsx('prices')(model);
    await new WaitForEvent(pricesExpression, 'changed').wait(emptyFunction);

    const setChange = await new WaitForEvent(pricesExpression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.prices.set('premium', 20);
    });

    console.log('map set emitted:', setChange === pricesExpression); // true

  return pricesExpression;
`;

const setCollectionCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    tasks: new Set(['task-a']),
  };

  // Watch the whole collection
  const tasksExpression = rsx('tasks')(model);
  await new WaitForEvent(tasksExpression, 'changed').wait(emptyFunction);

  const addChange = await new WaitForEvent(tasksExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.tasks.add('task-b');
  });

  console.log('set add emitted:', addChange === tasksExpression); // true
`;

const setCollectionPlaygroundScript = dedent`
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const emptyFunction = () => {};

  const model = {
    tasks: new Set(['task-a']),
  };

  // Watch the whole collection
  const tasksExpression = rsx('tasks')(model);
    await new WaitForEvent(tasksExpression, 'changed').wait(emptyFunction);

    const addChange = await new WaitForEvent(tasksExpression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.tasks.add('task-b');
    });

    console.log('set add emitted:', addChange === tasksExpression); // true

  return tasksExpression;
`;

const arrayBasicsCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    cart: [
      { id: 'A', qty: 1 },
      { id: 'B', qty: 2 },
    ],
  };

  // Default: non-recursive leaf watching
  const firstItemExpression = rsx('cart[0]')(model);

  await new WaitForEvent(firstItemExpression, 'changed').wait(emptyFunction);

  // Not tracked by default (nested leaf property)
  const nestedChange = await new WaitForEvent(firstItemExpression, 'changed', {
    ignoreInitialValue: true,
    timeout: 100,
  }).wait(() => {
    model.cart[0].qty = 3;
  });
  console.log('nested qty change emitted:', nestedChange !== null); // false

  // Tracked (expressed leaf itself changed)
  const directChange = await new WaitForEvent(firstItemExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.cart[0] = { id: 'A', qty: 4 };
  });
  console.log('item replacement emitted:', directChange === firstItemExpression); // true
`;

const arrayBasicsPlaygroundScript = dedent`
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const emptyFunction = () => {};

  const model = {
    cart: [
      { id: 'A', qty: 1 },
      { id: 'B', qty: 2 },
    ],
  };

  // Default: non-recursive leaf watching
  const firstItemExpression = rsx('cart[0]')(model);
    await new WaitForEvent(firstItemExpression, 'changed').wait(emptyFunction);

    // Not tracked by default (nested leaf property)
    const nestedChange = await new WaitForEvent(firstItemExpression, 'changed', {
      ignoreInitialValue: true,
      timeout: 100,
    }).wait(() => {
      model.cart[0].qty = 3;
    });
    console.log('nested qty change emitted:', nestedChange !== null); // false

    // Tracked (expressed leaf itself changed)
    const directChange = await new WaitForEvent(firstItemExpression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.cart[0] = { id: 'A', qty: 4 };
    });
    console.log('item replacement emitted:', directChange === firstItemExpression); // true

  return firstItemExpression;
`;

const arraySpecificCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';
  import { IndexWatchRule } from '@rs-x/state-manager';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    cart: [
      { id: 'A', qty: 1, note: 'tracked item' },
      { id: 'B', qty: 5, note: 'ignored item' },
    ],
  };

  const watchRule = new IndexWatchRule(model, (index, target, rootModel) => {
    if (target === rootModel && index === 'cart') {
      return true;
    }

    if (Array.isArray(target)) {
      return Number(index) === 0;
    }

    if (target === rootModel.cart[0]) {
      return String(index) === 'qty';
    }

    return false;
  });

  // Recursive leaf watching (enabled by rule)
  const firstItemExpression = rsx('cart[0]')(model, watchRule);
  await new WaitForEvent(firstItemExpression, 'changed').wait(emptyFunction);

  const trackedChange = await new WaitForEvent(firstItemExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.cart[0].qty = 4; // tracked by rule
  });
  console.log('recursive qty change emitted:', trackedChange === firstItemExpression); // true

  const ignoredChange = await new WaitForEvent(firstItemExpression, 'changed', {
    ignoreInitialValue: true,
    timeout: 100,
  }).wait(() => {
    model.cart[0].note = 'ignored'; // ignored by rule
  });
  console.log('note change emitted:', ignoredChange !== null); // false
`;

const arraySpecificPlaygroundScript = dedent`
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const { IndexWatchRule } = api;
  const emptyFunction = () => {};

  const model = {
    cart: [
      { id: 'A', qty: 1, note: 'tracked item' },
      { id: 'B', qty: 5, note: 'ignored item' },
    ],
  };

  const watchRule = new IndexWatchRule(model, (index, target, rootModel) => {
    if (target === rootModel && index === 'cart') {
      return true;
    }

    if (Array.isArray(target)) {
      return Number(index) === 0;
    }

    if (target === rootModel.cart[0]) {
      return String(index) === 'qty';
    }

    return false;
  });

  // Recursive leaf watching (enabled by rule)
  const firstItemExpression = rsx('cart[0]')(model, watchRule);
    await new WaitForEvent(firstItemExpression, 'changed').wait(emptyFunction);

    const trackedChange = await new WaitForEvent(firstItemExpression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.cart[0].qty = 4; // tracked by rule
    });
    console.log('recursive qty change emitted:', trackedChange === firstItemExpression); // true

    const ignoredChange = await new WaitForEvent(firstItemExpression, 'changed', {
      ignoreInitialValue: true,
      timeout: 100,
    }).wait(() => {
      model.cart[0].note = 'ignored'; // ignored by rule
    });
    console.log('note change emitted:', ignoredChange !== null); // false

  return firstItemExpression;
`;

const mapBasicsCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    prices: new Map([
      ['admin', { enabled: true, note: 'leaf object' }],
      ['guest', { enabled: false, note: 'other object' }],
    ]),
  };

  // Default: non-recursive leaf watching
  const adminExpression = rsx('prices["admin"]')(model);
  await new WaitForEvent(adminExpression, 'changed').wait(emptyFunction);

  const nestedChange = await new WaitForEvent(adminExpression, 'changed', {
    ignoreInitialValue: true,
    timeout: 100,
  }).wait(() => {
    const admin = model.prices.get('admin');
    if (admin) {
      admin.enabled = false;
    }
  });
  console.log('nested enabled change emitted:', nestedChange !== null); // false

  const directChange = await new WaitForEvent(adminExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.prices.set('admin', { enabled: false, note: 'replaced' });
  });
  console.log('map key replacement emitted:', directChange === adminExpression); // true
`;

const mapBasicsPlaygroundScript = dedent`
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const emptyFunction = () => {};

  const model = {
    prices: new Map([
      ['admin', { enabled: true, note: 'leaf object' }],
      ['guest', { enabled: false, note: 'other object' }],
    ]),
  };

  // Default: non-recursive leaf watching
  const adminExpression = rsx('prices["admin"]')(model);
    await new WaitForEvent(adminExpression, 'changed').wait(emptyFunction);

    const nestedChange = await new WaitForEvent(adminExpression, 'changed', {
      ignoreInitialValue: true,
      timeout: 100,
    }).wait(() => {
      const admin = model.prices.get('admin');
      if (admin) {
        admin.enabled = false;
      }
    });
    console.log('nested enabled change emitted:', nestedChange !== null); // false

    const directChange = await new WaitForEvent(adminExpression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.prices.set('admin', { enabled: false, note: 'replaced' });
    });
    console.log('map key replacement emitted:', directChange === adminExpression); // true

  return adminExpression;
`;

const mapSpecificCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';
  import { IndexWatchRule } from '@rs-x/state-manager';

  await InjectionContainer.load(RsXExpressionParserModule);

  const admin = { enabled: true, note: 'tracked leaf' };
  const guest = { enabled: false, note: 'other leaf' };

  const model = {
    roles: new Map([
      ['admin', admin],
      ['guest', guest],
    ]),
  };

  const watchRule = new IndexWatchRule(model, (index, target, rootModel) => {
    if (target === rootModel && index === 'roles') {
      return true;
    }

    if (target instanceof Map) {
      return String(index) === 'admin';
    }

    if (target === rootModel.roles.get('admin')) {
      return String(index) === 'enabled';
    }

    return false;
  });

  // Recursive leaf watching (enabled by rule)
  const adminExpression = rsx('roles["admin"]')(model, watchRule);
  await new WaitForEvent(adminExpression, 'changed').wait(emptyFunction);

  const trackedChange = await new WaitForEvent(adminExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    admin.enabled = false; // tracked by rule
  });
  console.log('recursive enabled change emitted:', trackedChange === adminExpression); // true

  const ignoredChange = await new WaitForEvent(adminExpression, 'changed', {
    ignoreInitialValue: true,
    timeout: 100,
  }).wait(() => {
    admin.note = 'ignored'; // ignored by rule
  });
  console.log('note change emitted:', ignoredChange !== null); // false
`;

const mapSpecificPlaygroundScript = dedent`
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const { IndexWatchRule } = api;
  const emptyFunction = () => {};

  const admin = { enabled: true, note: 'tracked leaf' };
  const guest = { enabled: false, note: 'other leaf' };

  const model = {
    roles: new Map([
      ['admin', admin],
      ['guest', guest],
    ]),
  };

  const watchRule = new IndexWatchRule(model, (index, target, rootModel) => {
    if (target === rootModel && index === 'roles') {
      return true;
    }

    if (target instanceof Map) {
      return String(index) === 'admin';
    }

    if (target === rootModel.roles.get('admin')) {
      return String(index) === 'enabled';
    }

    return false;
  });

  // Recursive leaf watching (enabled by rule)
  const adminExpression = rsx('roles["admin"]')(model, watchRule);
    await new WaitForEvent(adminExpression, 'changed').wait(emptyFunction);

    const trackedChange = await new WaitForEvent(adminExpression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      admin.enabled = false; // tracked by rule
    });
    console.log('recursive enabled change emitted:', trackedChange === adminExpression); // true

    const ignoredChange = await new WaitForEvent(adminExpression, 'changed', {
      ignoreInitialValue: true,
      timeout: 100,
    }).wait(() => {
      admin.note = 'ignored'; // ignored by rule
    });
    console.log('note change emitted:', ignoredChange !== null); // false

  return adminExpression;
`;

const setBasicsCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const taskA = { id: 'A', done: false, note: 'leaf object' };
  const taskB = { id: 'B', done: false, note: 'other object' };

  const model = {
    trackedTask: taskA,
    tasks: new Set([taskA, taskB]),
  };

  // Default: non-recursive leaf watching
  const trackedTaskExpression = rsx('tasks[trackedTask]')(model);
  await new WaitForEvent(trackedTaskExpression, 'changed').wait(emptyFunction);

  const nestedChange = await new WaitForEvent(trackedTaskExpression, 'changed', {
    ignoreInitialValue: true,
    timeout: 100,
  }).wait(() => {
    taskA.done = true;
  });
  console.log('nested done change emitted:', nestedChange !== null); // false

  const directChange = await new WaitForEvent(trackedTaskExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.tasks.delete(taskA);
  });
  console.log('set membership change emitted:', directChange === trackedTaskExpression); // true
`;

const setBasicsPlaygroundScript = dedent`
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const emptyFunction = () => {};

  const taskA = { id: 'A', done: false, note: 'leaf object' };
  const taskB = { id: 'B', done: false, note: 'other object' };

  const model = {
    trackedTask: taskA,
    tasks: new Set([taskA, taskB]),
  };

  // Default: non-recursive leaf watching
  const trackedTaskExpression = rsx('tasks[trackedTask]')(model);
    await new WaitForEvent(trackedTaskExpression, 'changed').wait(emptyFunction);

    const nestedChange = await new WaitForEvent(trackedTaskExpression, 'changed', {
      ignoreInitialValue: true,
      timeout: 100,
    }).wait(() => {
      taskA.done = true;
    });
    console.log('nested done change emitted:', nestedChange !== null); // false

    const directChange = await new WaitForEvent(trackedTaskExpression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.tasks.delete(taskA);
    });
    console.log('set membership change emitted:', directChange === trackedTaskExpression); // true

  return trackedTaskExpression;
`;

const setSpecificCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';
  import { IndexWatchRule } from '@rs-x/state-manager';

  await InjectionContainer.load(RsXExpressionParserModule);

  const taskA = { id: 'A', done: false, note: 'tracked member' };
  const taskB = { id: 'B', done: false, note: 'ignored member' };

  const model = {
    trackedTask: taskA,
    tasks: new Set([taskA, taskB]),
  };

  const isTrackedTask = (candidate: unknown, tracked: { id: string }) => {
    if (candidate === tracked) {
      return true;
    }

    return (
      typeof candidate === 'object' &&
      candidate !== null &&
      (candidate as { id?: unknown }).id === tracked.id
    );
  };

  const watchRule = new IndexWatchRule(model, (index, target, rootModel) => {
    if (target === rootModel && index === 'tasks') {
      return true;
    }

    if (target instanceof Set) {
      return isTrackedTask(index, rootModel.trackedTask);
    }

    if (isTrackedTask(target, rootModel.trackedTask)) {
      return String(index) === 'done';
    }

    return false;
  });

  // Recursive leaf watching (enabled by rule)
  const trackedTaskExpression = rsx('tasks[trackedTask]')(model, watchRule);
  await new WaitForEvent(trackedTaskExpression, 'changed').wait(emptyFunction);

  const trackedChange = await new WaitForEvent(trackedTaskExpression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    taskA.done = true; // tracked by rule
  });
  console.log('recursive done change emitted:', trackedChange === trackedTaskExpression); // true

  const ignoredChange = await new WaitForEvent(trackedTaskExpression, 'changed', {
    ignoreInitialValue: true,
    timeout: 100,
  }).wait(() => {
    taskA.note = 'ignored'; // ignored by rule
  });
  console.log('note change emitted:', ignoredChange !== null); // false
`;

const setSpecificPlaygroundScript = dedent`
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const { IndexWatchRule } = api;
  const emptyFunction = () => {};

  const taskA = { id: 'A', done: false, note: 'tracked member' };
  const taskB = { id: 'B', done: false, note: 'ignored member' };

  const model = {
    trackedTask: taskA,
    tasks: new Set([taskA, taskB]),
  };

  const isTrackedTask = (candidate, tracked) => {
    if (candidate === tracked) {
      return true;
    }

    return (
      typeof candidate === 'object' &&
      candidate !== null &&
      candidate.id === tracked.id
    );
  };

  const watchRule = new IndexWatchRule(model, (index, target, rootModel) => {
    if (target === rootModel && index === 'tasks') {
      return true;
    }

    if (target instanceof Set) {
      return isTrackedTask(index, rootModel.trackedTask);
    }

    if (isTrackedTask(target, rootModel.trackedTask)) {
      return String(index) === 'done';
    }

    return false;
  });

  // Recursive leaf watching (enabled by rule)
  const trackedTaskExpression = rsx('tasks[trackedTask]')(model, watchRule);
    await new WaitForEvent(trackedTaskExpression, 'changed').wait(emptyFunction);

    const trackedChange = await new WaitForEvent(trackedTaskExpression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      taskA.done = true; // tracked by rule
    });
    console.log('recursive done change emitted:', trackedChange === trackedTaskExpression); // true

    const ignoredChange = await new WaitForEvent(trackedTaskExpression, 'changed', {
      ignoreInitialValue: true,
      timeout: 100,
    }).wait(() => {
      taskA.note = 'ignored'; // ignored by rule
    });
    console.log('note change emitted:', ignoredChange !== null); // false

  return trackedTaskExpression;
`;

const collectionLevelExamples: CollectionExample[] = [
  {
    title: 'Array collection',
    description:
      'Watch the array itself and react when items are pushed/removed/reordered.',
    code: arrayCollectionCode,
    playgroundScript: arrayCollectionPlaygroundScript,
  },
  {
    title: 'Map collection',
    description:
      'Watch the map itself and react when keys are added/replaced/deleted.',
    code: mapCollectionCode,
    playgroundScript: mapCollectionPlaygroundScript,
  },
  {
    title: 'Set collection',
    description:
      'Watch the set itself and react when members are added/deleted.',
    code: setCollectionCode,
    playgroundScript: setCollectionPlaygroundScript,
  },
];

const collectionItemExamples: CollectionExample[] = [
  {
    title: 'Array: non-recursive (default)',
    description:
      'By default, rs-x tracks the expressed array leaf only. Nested property changes on that leaf are ignored unless you replace the expressed item itself.',
    code: arrayBasicsCode,
    playgroundScript: arrayBasicsPlaygroundScript,
  },
  {
    title: 'Array: recursive (with IndexWatchRule)',
    description:
      'This example turns on recursive leaf watching for cart[0].qty by passing an IndexWatchRule.',
    code: arraySpecificCode,
    playgroundScript: arraySpecificPlaygroundScript,
  },
  {
    title: 'Map: non-recursive (default)',
    description:
      'By default, rs-x tracks the expressed map key leaf itself. Nested property changes on that key value are ignored.',
    code: mapBasicsCode,
    playgroundScript: mapBasicsPlaygroundScript,
  },
  {
    title: 'Map: recursive (with IndexWatchRule)',
    description:
      'This example keeps watching the admin key branch recursively and reacts to the enabled property using IndexWatchRule.',
    code: mapSpecificCode,
    playgroundScript: mapSpecificPlaygroundScript,
  },
  {
    title: 'Set: non-recursive (default)',
    description:
      'By default, rs-x tracks the expressed set member leaf itself. Nested property changes on that member are ignored.',
    code: setBasicsCode,
    playgroundScript: setBasicsPlaygroundScript,
  },
  {
    title: 'Set: recursive (with IndexWatchRule)',
    description:
      'This example enables recursive watching for one member and one nested property via IndexWatchRule.',
    code: setSpecificCode,
    playgroundScript: setSpecificPlaygroundScript,
  },
];

export const metadata = {
  title: 'Collections',
  description:
    'Non-technical guide for Array/Map/Set reactivity in rs-x, including specific-item monitoring patterns.',
};

export default function CollectionsDocsPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'Collections' },
            ]}
          />
          <p className="docsApiEyebrow">Guide</p>
          <h1 className="sectionTitle">Collections</h1>
          <p className="sectionLead">
            <span className="codeInline">Array</span>,{' '}
            <span className="codeInline">Map</span>, and{' '}
            <span className="codeInline">Set</span> are reactive in rs-x
            expressions.
          </p>
        </div>
      </div>

      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">What this means in practice</h2>
          <p className="cardText">
            Collections can be watched at two levels: the full collection
            expression (for example <span className="codeInline">cart</span>)
            or a selected entry expression (for example{' '}
            <span className="codeInline">cart[0]</span>).
          </p>
          <p className="cardText">
            Full collection expressions react to collection mutations like push,
            set, add, delete, and clear. Selected entry expressions react to
            that specific index/key/member. Nested properties inside the
            selected entry are only tracked when you pass an{' '}
            <span className="codeInline">IndexWatchRule</span>.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">How collection updates flow</h2>
          <ul className="advancedTopicList">
            <li>
              Watch an array property (for example{' '}
              <span className="codeInline">cart</span>) to react to mutations
              like push/pop/splice.
            </li>
            <li>
              Watch a map property (for example{' '}
              <span className="codeInline">prices</span>) to react to
              mutations like set/delete/clear.
            </li>
            <li>
              Watch a set property (for example{' '}
              <span className="codeInline">tasks</span>) to react to
              mutations like add/delete/clear.
            </li>
            <li>
              Watch <span className="codeInline">items[0]</span>,{' '}
              <span className="codeInline">roles["admin"]</span>, or{' '}
              <span className="codeInline">tasks[trackedTask]</span> to react
              to one selected entry.
            </li>
            <li>
              Use <span className="codeInline">IndexWatchRule</span> when you
              also need nested property tracking inside that selected entry.
            </li>
          </ul>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Behavior by collection type</h2>
          <p className="cardText">
            <strong>Array:</strong> rs-x reacts when an item is changed, moved,
            added, or removed. This is useful for cart rows, table data, and
            ordered steps in workflows.
          </p>
          <p className="cardText">
            <strong>Map:</strong> rs-x reacts at key level. It can pick up
            updates when a key is added, replaced, or deleted. This is useful
            when your model is keyed by ids, names, or roles.
          </p>
          <p className="cardText">
            <strong>Set:</strong> rs-x reacts to membership changes and can
            also react to tracked member details. This is useful for selections,
            tags, and active item groups.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">When to watch full collection vs item</h2>
          <p className="cardText">
            Use a full collection expression when you care about collection
            mutations. Example: <span className="codeInline">cart</span> reacts
            to array operations like push/splice,{' '}
            <span className="codeInline">prices</span> reacts to map set/delete,
            and <span className="codeInline">tasks</span> reacts to set add/delete.
          </p>
          <p className="cardText">
            Use an item/key/member expression when you need to observe one
            selected entry, not the whole collection. This keeps updates focused
            on the selected branch and avoids reacting to unrelated entries. Add
            an{' '}
            <span className="codeInline">IndexWatchRule</span> when the selected
            entry must also react to nested fields (for example{' '}
            <span className="codeInline">done</span> or{' '}
            <span className="codeInline">qty</span>).
          </p>
          <ul className="advancedTopicList">
            <li>
              Use a full collection expression for structural mutations:
              add/remove/replace entries.
            </li>
            <li>
              Use an item/key/member expression when only one selected entry
              matters.
            </li>
            <li>
              Add <span className="codeInline">IndexWatchRule</span> only when
              nested fields inside that selected entry must trigger updates.
            </li>
          </ul>
        </article>

        <CollectionExamplesTabs
          defaultValue="entry"
          tabs={[
            {
              value: 'entry',
              label: 'Watch collection item',
              description:
                'These examples watch one selected entry path and show when nested changes require IndexWatchRule.',
            },
            {
              value: 'collection',
              label: 'Watch collection',
              description: '',
            },
          ]}
        >
          <>
            {collectionItemExamples.map((example) => (
              <article key={example.title} className="card docsApiCard">
                <h2 className="cardTitle">{example.title}</h2>
                <p className="cardText">{example.description}</p>
                <div className="cardLinks">
                  <Link
                    className="cardLink"
                    href={toPlaygroundHref(example.playgroundScript)}
                  >
                    Try in playground <span aria-hidden="true">→</span>
                  </Link>
                </div>
                <SyntaxCodeBlock code={example.code} />
              </article>
            ))}
          </>
          <>
            {collectionLevelExamples.map((example) => (
              <article key={example.title} className="card docsApiCard">
                <h2 className="cardTitle">{example.title}</h2>
                <p className="cardText">{example.description}</p>
                <div className="cardLinks">
                  <Link
                    className="cardLink"
                    href={toPlaygroundHref(example.playgroundScript)}
                  >
                    Try in playground <span aria-hidden="true">→</span>
                  </Link>
                </div>
                <SyntaxCodeBlock code={example.code} />
              </article>
            ))}
          </>
        </CollectionExamplesTabs>
      </div>
    </DocsPageTemplate>
  );
}
