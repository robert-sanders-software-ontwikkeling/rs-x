import dedent from 'dedent';
import { notFound } from 'next/navigation';
import React from 'react';

import { DocsApiPageTemplate } from '../../../../components/DocsApiPageTemplate';
import {
  parseDeclarationMembers,
  readFullTypeDeclaration,
  type SymbolDocumentation,
} from '../../components/api-member';
import { stateManagerApiBySymbol } from '../state-manager-api.helpers';

const STATE_MANAGER_GITHUB_BASE =
  'https://github.com/robert-sanders-software-ontwikkeling/rs-x/blob/main/rs-x-state-manager/lib';

const MODULE_DETAILS: Record<string, string> = {
  'state-manager':
    'Core state tracking module. Contains `StateManager` (the runtime implementation), `IStateManager` (its contract), the `IStateChange` and `IContextChanged` event payloads, `IStateOptions` for configuring recursive watches, and `IStateEventListener` for low-level keyed callbacks.',
  'state-manager/state-change-subscription-manager':
    'Handles grouped observer subscriptions for each watched state key and index-watch-rule variant.',
  'grouped-change-subscriptions-for-context-manager':
    'Groups watcher subscriptions by context and exposes per-context subscription orchestration.',
  'object-property-observer-proxy-pair-manager':
    'Resolves observer/proxy pair managers by value type and coordinates observer lifecycle.',
  'object-observer':
    'Contains object-level observer contracts and managers used to detect structural and nested changes.',
  'object-observer/factories':
    'Factory set that selects observer/proxy strategies for arrays, maps, sets, dates, promises, observables, and plain objects.',
  'property-observer':
    'Property-level observer contracts and base abstractions.',
  'property-observer/factories':
    'Property observer factory entry points used by the runtime to track index/key/path changes.',
  'property-observer/factories/collection-item':
    'Specialized property observers for collection item tracking (Array/Map/Set item-level observers).',
  'property-observer/factories/date-property':
    'Specialized property observers for Date property paths (year/month/day/utc variants and time).',
  'property-observer/factories/indexed-value-observer-proxy-pair':
    'Observer/proxy pair support for indexed-value scenarios.',
  'property-observer/factories/non-iterable-object-property':
    'Property observer strategy for non-iterable object properties.',
  'index-watch-rule-registry':
    'Index-watch-rule contracts, registry, and default recursive/non-recursive watch rules.',
  'proxies/array-proxy':
    'Array proxy factory and contracts that emit semantic index/mutation changes.',
  'proxies/map-proxy':
    'Map proxy factory and contracts that emit semantic key/mutation changes.',
  'proxies/set-proxy':
    'Set proxy factory and contracts that emit semantic membership changes.',
  'proxies/date-proxy':
    'Date proxy factory that maps setter calls to semantic date-part changes.',
  'proxies/promise-proxy':
    'Promise proxy factory and change contracts for resolved/rejected transitions.',
  'proxies/observable-proxy':
    'Observable proxy factory and change contracts for emitted value transitions.',
  'rs-x-state-manager.module':
    'DI module registration for state-manager services, observer factories, and proxy factories.',
  'rs-x-state-manager-injection-tokens':
    'Injection token surface for resolving state-manager services from the container.',
  'object-change':
    'Object change contract and related type definitions used in the change pipeline.',
  'observer-group': 'Observer grouping contracts and helper types.',
  'observer.interface': 'Observer lifecycle interface contract.',
};

const MEMBER_DESCRIPTION_OVERRIDES: Record<string, Record<string, string>> = {
  IStateManager: {
    changed:
      'Emits an `IStateChange` event every time a watched value meaningfully changes. The payload includes `{ context, index, oldValue, newValue, oldContext }`. Subscribe here to react to any mutation across all watched state.',
    contextChanged:
      'Emits an `IContextChanged` event when the object at a watched path is replaced — for example when `model.doc` is assigned a new `TextDocument` instance. The expression runtime uses this to rebind downstream slots to the new context.',
    startChangeCycle:
      'Emits `void` at the start of a change-processing cycle, before queued observer notifications are flushed. Useful for batching UI updates or measuring throughput.',
    endChangeCycle:
      'Emits `void` after all queued observer notifications in the current change cycle have been processed. Pair with `startChangeCycle` to bracket a batch of related changes.',
    watchState:
      'Starts watching `context[index]`. Creates an observer/proxy pair for the value, subscribes to mutations, and stores the current value. Returns the current value snapshot. Watches are reference-counted — each call increments the counter, and you must call `releaseState` once per `watchState` call. Accepts an optional `IStateOptions` with `indexWatchRule` (for recursive watching) and `ownerId` (for ownership tagging).',
    subscribeStateEvents:
      'Registers a low-overhead keyed listener directly on `(context, index)` without going through the global `changed` observable. Used internally by the expression runtime. Returns an unsubscribe function — call it to remove the listener.',
    releaseState:
      'Decrements the watch reference count for `(context, index)`. When the count reaches zero, the observer is disposed and the proxy is unregistered. Always call `releaseState` once for each `watchState` call to prevent memory leaks. Pass the same `indexWatchRule` you passed to `watchState` so the correct subscription bucket is released.',
    isWatched:
      'Returns `true` if `(context, index)` is currently registered in the watcher graph (optionally scoped to a specific `indexWatchRule`). Useful for avoiding redundant `watchState` calls.',
    clear:
      'Disposes all subscriptions, observer/proxy pairs, and state store entries managed by this instance. Call when tearing down the entire application or a bounded DI scope.',
    getState:
      'Reads the currently stored value for `(context, index)` from the internal state store. Primarily used inside getters for computed properties that were written via `setState`.',
    setState:
      'Writes a value for `(context, index)` into the internal state store. If the new value differs from the old, triggers rebinding and emits on `changed`. Use this in setters of computed/derived properties so the expression runtime can observe the result — do not use it for plain model properties (direct assignment handles those).',
    toString:
      'Returns a string dump of the internal state store — useful for diagnosing which `(context, index)` pairs are currently tracked.',
  },
  StateManager: {
    changed:
      'Emits an `IStateChange` event after each mutation cycle. The payload `{ context, index, oldValue, newValue, oldContext }` lets subscribers identify exactly which slot changed and what the previous value was.',
    contextChanged:
      'Emits when the object at a watched path is swapped out for a new instance. The expression runtime subscribes here to rebind all downstream expressions to the new context object.',
    startChangeCycle:
      'Emits `void` before StateManager flushes the pending change queue. Subscribe to perform work that should precede all change notifications for a given cycle.',
    endChangeCycle:
      'Emits `void` after StateManager finishes processing all pending changes. Subscribe to perform work that should follow the complete cycle — e.g. triggering a single re-render after many fields changed.',
    watchState:
      'Registers a watch for `context[index]`. Wraps the current value in an observer/proxy, stores a snapshot, and increments the reference count. Returns the current value. Pass `{ indexWatchRule: watchIndexRecursiveRule }` as the third argument to enable recursive (deep) watching of nested objects.',
    subscribeStateEvents:
      'Low-level event subscription used by the expression runtime. Prefer subscribing to the `changed` observable for application code; use this only when you need per-slot callbacks without the overhead of a shared observable.',
    releaseState:
      'Decrements the watch reference count for `(context, index)`. When the count reaches zero the observer is torn down and the proxy is unregistered. Call once for each `watchState` call. Pass the same `indexWatchRule` that was used when watching.',
    clear:
      'Tears down all subscriptions, observer proxies, and state store entries in this StateManager instance.',
    getState:
      'Reads the stored value for `(context, index)`. Typically called inside a getter that exposes a computed value stored via `setState`.',
    setState:
      'Stores a new value for `(context, index)`. Emits a `changed` event if the value differs from the previous snapshot. Use this to push derived or computed values into the reactive graph so expressions can observe them.',
    isWatched:
      'Returns `true` when `(context, index)` is actively tracked. Useful for guard checks before calling `watchState` a second time.',
    toString:
      'Returns a diagnostic string snapshot of all tracked `(context, index)` pairs and their stored values.',
  },
};

const SYMBOL_DOCS: Record<string, SymbolDocumentation> = {
  StateManager: {
    fullSignature: dedent`
      export class StateManager implements IStateManager {
        readonly changed: Observable<IStateChange>;
        readonly contextChanged: Observable<IContextChanged>;
        readonly startChangeCycle: Observable<void>;
        readonly endChangeCycle: Observable<void>;
        isWatched(context: unknown, index: unknown, indexWatchRule?: IIndexWatchRule): boolean;
        watchState(context: unknown, index: unknown, options?: IStateOptions): unknown;
        subscribeStateEvents(context: unknown, index: unknown, listener: IStateEventListener): () => void;
        releaseState(context: unknown, index: unknown, indexWatchRule?: IIndexWatchRule): void;
        getState<T>(context: unknown, index: unknown): T;
        setState<T>(context: unknown, index: unknown, value: T, ownerId?: unknown): void;
        clear(): void;
        toString(): string;
      }
    `,
    summary:
      'Central reactive registry that bridges your model with the rs-x expression runtime. When you call `watchState(context, index)`, StateManager wraps the value at `context[index]` in an observer/proxy, begins tracking mutations, and emits on `changed` whenever the value meaningfully changes. Watches are reference-counted — each `watchState` call must be paired with a corresponding `releaseState` call to avoid memory leaks.',
    notes:
      'The `rsx()` expression runtime calls `watchState` and `releaseState` automatically for every leaf node it observes, so most application code never touches StateManager directly. You need to call it yourself in two cases: (1) **computed / derived properties** — store derived values with `setState` and expose them via a getter using `getState`, so the expression runtime can observe them as if they were plain model fields; (2) **custom data type integration** — call `watchState` directly when wiring a custom observer/proxy stack into the reactive graph.',
    exampleCode: dedent`
      import { InjectionContainer } from '@rs-x/core';
      import {
        RsXStateManagerModule,
        RsXStateManagerInjectionTokens,
        watchIndexRecursiveRule,
        type IStateChange,
        type IStateManager,
      } from '@rs-x/state-manager';

      await InjectionContainer.load(RsXStateManagerModule);

      const stateManager = InjectionContainer.get<IStateManager>(
        RsXStateManagerInjectionTokens.IStateManager,
      );

      // ── 1. Watch a plain property ────────────────────────────────
      const model = { x: { y: 10 } };

      // watchState returns the current value and starts observing.
      const current = stateManager.watchState(model, 'x');
      console.log(current); // { y: 10 }

      stateManager.changed.subscribe((change: IStateChange) => {
        console.log('x changed:', change.newValue);
      });

      model.x = { y: 20 }; // → emits { y: 20 }

      // Always release when done. Reference count drops to 0 → observer torn down.
      stateManager.releaseState(model, 'x');

      // ── 2. Watch recursively (deep observation) ──────────────────
      const doc = { content: { title: 'Hello', body: 'World' } };

      stateManager.watchState(doc, 'content', {
        indexWatchRule: watchIndexRecursiveRule,
      });

      stateManager.changed.subscribe((change: IStateChange) => {
        console.log('content changed:', change.newValue);
      });

      doc.content.title = 'Updated'; // → emits because recursive watch is on

      // Pass the same indexWatchRule to releaseState
      stateManager.releaseState(doc, 'content', watchIndexRecursiveRule);

      // ── 3. Computed / derived property ───────────────────────────
      class CartModel {
        private readonly _totalKey = 'total';
        private _items: { price: number }[] = [];

        public get total(): number {
          // Read derived value out of the state store.
          return stateManager.getState<number>(this, this._totalKey) ?? 0;
        }

        public set items(value: { price: number }[]) {
          this._items = value;
          // Push derived value into the state store.
          // StateManager emits a changed event so expressions observing
          // cart.total re-evaluate automatically.
          stateManager.setState(
            this,
            this._totalKey,
            this._items.reduce((sum, item) => sum + item.price, 0),
          );
        }

        public dispose(): void {
          stateManager.releaseState(this, this._totalKey);
        }
      }

      const cart = new CartModel();
      stateManager.watchState(cart, 'total');

      stateManager.changed.subscribe((change: IStateChange) => {
        console.log('total:', change.newValue);
      });

      cart.items = [{ price: 10 }, { price: 20 }]; // → emits total: 30
      cart.items = [{ price: 5 }];                  // → emits total: 5

      cart.dispose();
    `,
  },
  IStateManager: {
    summary:
      'The contract implemented by `StateManager`. Defines the full public API for watching, reading, writing, and releasing reactive state — plus the four observable streams (`changed`, `contextChanged`, `startChangeCycle`, `endChangeCycle`) that the expression runtime and application code subscribe to.',
  },
  IStateEventListener: {
    summary:
      'Keyed callback listener contract used by `subscribeStateEvents(...)` for direct `(context, index)` state and context-rebind notifications.',
  },
};

function defaultExample(symbol: string, kind: string): string {
  if (kind === 'function') {
    return `import { ${symbol} } from '@rs-x/state-manager';\n\n${symbol}(/* arguments */);`;
  }
  if (kind === 'abstract class') {
    return `import { ${symbol} } from '@rs-x/state-manager';\n\nclass My${symbol} extends ${symbol} {\n  // implement abstract members\n}`;
  }
  if (kind.includes('class')) {
    return `import { ${symbol} } from '@rs-x/state-manager';\n\nconst instance = new ${symbol}(...args);`;
  }
  if (kind === 'interface') {
    return '';
  }
  if (kind === 'type') {
    return `import type { ${symbol} } from '@rs-x/state-manager';\n\ntype Local${symbol} = ${symbol};`;
  }
  if (kind === 'const') {
    return `import { ${symbol} } from '@rs-x/state-manager';\n\nconsole.log(${symbol});`;
  }
  return `import { ${symbol} } from '@rs-x/state-manager';`;
}

type StateManagerSymbolPageProps = {
  params: Promise<{ symbol: string }>;
};

const StateManagerApiSymbolPage: React.FC<
  StateManagerSymbolPageProps
> = async ({ params }) => {
  const { symbol } = await params;
  const entry = stateManagerApiBySymbol.get(decodeURIComponent(symbol));
  if (!entry) {
    notFound();
  }

  const override = SYMBOL_DOCS[entry.symbol];
  const moduleDetail =
    MODULE_DETAILS[entry.module] ??
    'State-manager runtime export used for observer orchestration, change propagation, and tracked state lifecycle.';

  let fullTypeSignature: string | null = null;
  if (
    !override?.fullSignature &&
    ['interface', 'class', 'abstract class', 'type'].includes(entry.kind)
  ) {
    try {
      fullTypeSignature = await readFullTypeDeclaration(
        'rs-x-state-manager',
        entry.symbol,
        entry.sourcePath,
        entry.kind,
      );
    } catch {
      fullTypeSignature = null;
    }
  }
  const apiSignature =
    override?.fullSignature ?? fullTypeSignature ?? entry.signature;
  const memberDocs = parseDeclarationMembers(
    apiSignature,
    entry.symbol,
    MEMBER_DESCRIPTION_OVERRIDES,
  );

  return (
    <DocsApiPageTemplate
      entry={entry}
      memberDocs={memberDocs}
      symbolDocs={SYMBOL_DOCS}
      related={[]}
      moduleDetail={moduleDetail}
      packageName="@rs-x/state-manager"
      fullTypeSignature={fullTypeSignature}
      defaultExample={defaultExample}
      defaultConstructorInjectionExample={() => ''}
      gitBasePath={STATE_MANAGER_GITHUB_BASE}
    />
  );
};

export default StateManagerApiSymbolPage;
