import dedent from 'dedent';
import type { Metadata } from 'next';

import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../_template/core-concept-page';

const exampleCode = dedent`
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

const playgroundScript = dedent`

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

const doc: CoreConceptDoc = {
  title: 'Readonly properties',
  lead: 'Expose a readonly property while still keeping it reactive through explicit state updates.',
  whatItMeans:
    'A readonly property should not be written from the outside, but it can still change when underlying writable fields change. In this pattern, you store the readonly value in `state manager` under an internal id, then read it through a getter.',
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
  exampleCode: exampleCode,
  playgroundScript: playgroundScript,
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
};

export const metadata: Metadata = {
  title: doc.title,
  description: doc.lead,
};

export default function Page() {
  return <CoreConceptPageLayout doc={doc} />;
}
