import {
  FeaturesComparisonClient,
  type IComparisonRow,
} from './features-comparison.client';

export const metadata = {
  title: 'Features',
  description:
    'Compare RS-X features with other reactive libraries and frameworks.',
};

const RSX_KEY = 'RS-X';

const FRAMEWORKS: string[] = [
  'React (Hooks)',
  'Vue 3 Reactivity',
  'Angular Signals',
  'Svelte',
  'SolidJS',
  'MobX',
  'RxJS',
  'Preact Signals',
];

const SOURCES = {
  rsx: {
    overview: '/docs',
    primitive: '/docs/iexpression',
    derived: '/docs/rsx-function',
    tracking: '/docs/observation',
    batching: '/docs/core-concepts/batching-transactions',
    async: '/docs/core-concepts/async-operations',
    cleanup: '/docs/iexpression',
    parsing: '/docs/rsx-function',
    tooling: '/docs/expression-change-tracker-manager',
    model: '/docs/observation',
    nesting: '/docs/core-concepts/member-expressions',
    ts: '/docs/iexpression',
  },
  react: {
    overview: 'https://react.dev/learn',
    primitive: 'https://react.dev/reference/react/useState',
    derived: 'https://react.dev/reference/react/useMemo',
    tracking: 'https://react.dev/reference/react/useEffect',
    rerender: 'https://react.dev/learn/render-and-commit',
    batching: 'https://react.dev/learn/queueing-a-series-of-state-updates',
    cleanup: 'https://react.dev/reference/react/useEffect',
    parsing: 'https://react.dev/learn/writing-markup-with-jsx',
    tooling: 'https://react.dev/learn/react-developer-tools',
  },
  vue: {
    overview: 'https://vuejs.org/guide/introduction.html',
    primitive: 'https://vuejs.org/api/reactivity-core.html',
    derived: 'https://vuejs.org/guide/essentials/computed.html',
    tracking: 'https://vuejs.org/guide/extras/reactivity-in-depth.html',
    rerender: 'https://vuejs.org/guide/essentials/watchers.html',
    batching: 'https://vuejs.org/api/general.html#nexttick',
    cleanup: 'https://vuejs.org/guide/essentials/watchers.html',
    parsing: 'https://vuejs.org/guide/essentials/template-syntax.html',
    tooling: 'https://devtools.vuejs.org/',
  },
  angular: {
    overview: 'https://angular.dev/overview',
    primitive: 'https://angular.dev/guide/signals',
    derived: 'https://angular.dev/guide/signals',
    tracking: 'https://angular.dev/guide/signals',
    rerender: 'https://angular.dev/guide/signals',
    batching: 'https://angular.dev/guide/signals',
    cleanup: 'https://angular.dev/guide/signals',
    parsing: 'https://angular.dev/guide/templates/expression-syntax',
    tooling: 'https://angular.dev/tools/devtools',
  },
  svelte: {
    overview: 'https://svelte.dev/docs/svelte/what-are-runes',
    primitive: 'https://svelte.dev/docs/svelte/$state',
    derived: 'https://svelte.dev/docs/svelte/$derived',
    tracking: 'https://svelte.dev/docs/svelte/$effect',
    rerender: 'https://svelte.dev/docs/svelte/$effect',
    batching: 'https://svelte.dev/docs/svelte#tick',
    cleanup: 'https://svelte.dev/docs/svelte/$effect',
    parsing: 'https://svelte.dev/docs/svelte/what-are-runes',
    tooling: 'https://svelte.dev/docs/svelte/@debug',
  },
  solid: {
    overview: 'https://docs.solidjs.com/concepts/intro-to-reactivity',
    primitive:
      'https://docs.solidjs.com/reference/basic-reactivity/create-signal',
    derived: 'https://docs.solidjs.com/reference/basic-reactivity/create-memo',
    tracking:
      'https://docs.solidjs.com/reference/basic-reactivity/create-effect',
    rerender:
      'https://docs.solidjs.com/reference/basic-reactivity/create-effect',
    batching: 'https://docs.solidjs.com/reference/reactive-utilities/batch',
    cleanup: 'https://docs.solidjs.com/reference/lifecycle/on-cleanup',
    parsing: 'https://docs.solidjs.com/concepts/intro-to-reactivity',
    tooling: 'https://docs.solidjs.com/concepts/intro-to-reactivity',
    store: 'https://docs.solidjs.com/reference/store-utilities/create-store',
  },
  mobx: {
    overview: 'https://mobx.js.org/the-gist-of-mobx.html',
    primitive: 'https://mobx.js.org/observable-state.html',
    derived: 'https://mobx.js.org/computeds.html',
    tracking: 'https://mobx.js.org/reactions.html',
    rerender: 'https://mobx.js.org/reactions.html',
    batching: 'https://mobx.js.org/actions.html',
    cleanup: 'https://mobx.js.org/reactions.html',
    parsing: 'https://mobx.js.org/the-gist-of-mobx.html',
    tooling: 'https://mobx.js.org/analyzing-reactivity.html',
  },
  rxjs: {
    overview: 'https://rxjs.dev/guide/overview',
    primitive: 'https://rxjs.dev/guide/observable',
    derived: 'https://rxjs.dev/guide/operators',
    tracking: 'https://rxjs.dev/guide/observable',
    rerender: 'https://rxjs.dev/guide/observable',
    batching: 'https://rxjs.dev/guide/scheduler',
    cleanup: 'https://rxjs.dev/guide/subscription',
    parsing: 'https://rxjs.dev/guide/observable',
    tooling:
      'https://github.com/ReactiveX/rxjs/blob/master/apps/rxjs.dev/content/guide/testing/marble-testing.md',
  },
  preactSignals: {
    overview: 'https://preactjs.com/guide/v10/signals/',
    primitive: 'https://preactjs.com/guide/v10/signals/',
    derived: 'https://preactjs.com/guide/v10/signals/',
    tracking: 'https://preactjs.com/guide/v10/signals/',
    rerender: 'https://preactjs.com/guide/v10/signals/',
    batching:
      'https://github.com/preactjs/signals/blob/main/packages/core/README.md',
    cleanup:
      'https://github.com/preactjs/signals/blob/main/packages/core/README.md',
    parsing: 'https://preactjs.com/guide/v10/signals/',
    tooling: 'https://preactjs.com/guide/v10/signals/',
  },
};

const withRef = (
  text: string,
  href: string,
): { text: string; docHref: string; docLabel: string } => ({
  text,
  docHref: href,
  docLabel: 'docs',
});

const COMPARISON_ROWS: IComparisonRow[] = [
  {
    dimension: 'What this is mainly for',
    values: {
      'RS-X': withRef(
        'A runtime expression engine that binds string formulas to plain JS/TS models. Framework-agnostic — no DOM or UI coupling. Runs in Node.js, browser, or any UI framework.',
        SOURCES.rsx.overview,
      ),
      'React (Hooks)': withRef(
        'A UI library where components re-render when state changes.',
        SOURCES.react.overview,
      ),
      'Vue 3 Reactivity': withRef(
        'A UI framework with a built-in runtime reactivity system.',
        SOURCES.vue.overview,
      ),
      'Angular Signals': withRef(
        "A full framework; signals are Angular's fine-grained reactive model for component state.",
        SOURCES.angular.overview,
      ),
      Svelte: withRef(
        'A UI framework with compiler-assisted reactivity using runes ($state, $derived, $effect).',
        SOURCES.svelte.overview,
      ),
      SolidJS: withRef(
        'A UI library focused on fine-grained reactive updates without a virtual DOM.',
        SOURCES.solid.overview,
      ),
      MobX: withRef(
        'A state management library based on observables, computed values, and reactions. Framework-agnostic with adapters for React and others.',
        SOURCES.mobx.overview,
      ),
      RxJS: withRef(
        'A reactive streams library for async and event-based data flows. No state management or expression binding built in.',
        SOURCES.rxjs.overview,
      ),
      'Preact Signals': withRef(
        'A signal-based reactive primitive. Core is framework-agnostic; official adapters for Preact and React.',
        SOURCES.preactSignals.overview,
      ),
    },
  },
  {
    dimension: 'UI framework coupling',
    values: {
      'RS-X': withRef(
        'None. Pure TypeScript with no DOM, rendering, or component model dependencies. Can be used alongside any UI framework or in pure Node.js.',
        SOURCES.rsx.overview,
      ),
      'React (Hooks)': withRef(
        'React only. Hooks are tied to the React component lifecycle.',
        SOURCES.react.overview,
      ),
      'Vue 3 Reactivity': withRef(
        'Vue only. The reactivity system is built into the Vue runtime.',
        SOURCES.vue.overview,
      ),
      'Angular Signals': withRef(
        "Angular only. Signals integrate with Angular's change detection and DI system.",
        SOURCES.angular.overview,
      ),
      Svelte: withRef(
        'Svelte only. Runes are compiled by the Svelte compiler and tied to component lifecycle.',
        SOURCES.svelte.overview,
      ),
      SolidJS: withRef(
        "SolidJS only. Reactivity is built into SolidJS's rendering model.",
        SOURCES.solid.overview,
      ),
      MobX: withRef(
        'Framework-agnostic. Official adapters available for React (mobx-react-lite) and others.',
        SOURCES.mobx.overview,
      ),
      RxJS: withRef(
        'Framework-agnostic. Works anywhere, but has no built-in concept of components or views.',
        SOURCES.rxjs.overview,
      ),
      'Preact Signals': withRef(
        'Core is framework-agnostic. Official bindings for Preact and React are available.',
        SOURCES.preactSignals.overview,
      ),
    },
  },
  {
    dimension: 'Model requirements',
    values: {
      'RS-X': withRef(
        'Plain JS/TS objects and arrays work as-is. No ref(), signal(), or @observable wrapping needed. StateManager instruments values transparently through observer proxies.',
        SOURCES.rsx.model,
      ),
      'React (Hooks)': withRef(
        'State must go through useState or useReducer. Direct mutation of plain objects does not trigger re-renders.',
        SOURCES.react.primitive,
      ),
      'Vue 3 Reactivity': withRef(
        'Values must be wrapped in ref() or reactive() to be reactive. Plain object mutation outside these wrappers is not tracked.',
        SOURCES.vue.primitive,
      ),
      'Angular Signals': withRef(
        'Values must be wrapped in signal() (or resource() for async). Plain properties are not automatically reactive.',
        SOURCES.angular.primitive,
      ),
      Svelte: withRef(
        "Values in reactive contexts must use the $state() rune. Plain let declarations are not reactive outside Svelte's compiler analysis.",
        SOURCES.svelte.primitive,
      ),
      SolidJS: withRef(
        'Values must use createSignal() to be reactive. Plain variables are read once and not tracked.',
        SOURCES.solid.primitive,
      ),
      MobX: withRef(
        'State must be decorated with @observable or wrapped with observable(). Plain object mutation is not tracked.',
        SOURCES.mobx.primitive,
      ),
      RxJS: withRef(
        'Reactive values require BehaviorSubject or Subject. Plain objects have no built-in reactivity.',
        SOURCES.rxjs.primitive,
      ),
      'Preact Signals': withRef(
        'Values must be wrapped in signal() to be reactive.',
        SOURCES.preactSignals.primitive,
      ),
    },
  },
  {
    dimension: 'Main reactive building block',
    values: {
      'RS-X': withRef(
        "IExpression<T> — a live binding produced by rsx('expr')(model). Tracks every property, collection item, Promise, and Observable it reads, and re-evaluates when any dependency changes.",
        SOURCES.rsx.primitive,
      ),
      'React (Hooks)': withRef(
        'Hook state values (useState, useReducer). Triggers component re-render on change.',
        SOURCES.react.primitive,
      ),
      'Vue 3 Reactivity': withRef(
        'ref() for primitive values and reactive() for objects. Both return proxies that track reads and writes.',
        SOURCES.vue.primitive,
      ),
      'Angular Signals': withRef(
        'signal() values (writable or computed). Read inside effects/templates to create dependencies.',
        SOURCES.angular.primitive,
      ),
      Svelte: withRef(
        '$state() values (Svelte 5 runes) or stores. Mutations inside components trigger reactive updates.',
        SOURCES.svelte.primitive,
      ),
      SolidJS: withRef(
        'createSignal() getter/setter pairs. Reading the getter inside effects/memos creates a dependency.',
        SOURCES.solid.primitive,
      ),
      MobX: withRef(
        'Observable state (objects, arrays, maps, primitives decorated with @observable or observable()).',
        SOURCES.mobx.primitive,
      ),
      RxJS: withRef(
        'Observable streams. Values flow through the stream pipeline on each emission.',
        SOURCES.rxjs.primitive,
      ),
      'Preact Signals': withRef(
        'signal() values. Reading .value inside effects/computed creates a dependency.',
        SOURCES.preactSignals.primitive,
      ),
    },
  },
  {
    dimension: 'How you define derived values',
    values: {
      'RS-X': withRef(
        "Write a string expression — rsx('price * qty - discount')(model). The expression IS the derived value: it evaluates immediately and re-evaluates whenever a dependency changes.",
        SOURCES.rsx.derived,
      ),
      'React (Hooks)': withRef(
        'Compute during render (inline JS), or memoize with useMemo. Re-runs when listed dependencies change.',
        SOURCES.react.derived,
      ),
      'Vue 3 Reactivity': withRef(
        'Use computed(() => ...) for auto-tracked cached derived values.',
        SOURCES.vue.derived,
      ),
      'Angular Signals': withRef(
        'Use computed(() => ...) signals. Re-evaluates when any signal read inside changes.',
        SOURCES.angular.derived,
      ),
      Svelte: withRef(
        'Use $derived(...) for reactive derived values. Recomputes when dependencies change.',
        SOURCES.svelte.derived,
      ),
      SolidJS: withRef(
        'Use createMemo(() => ...) for memoized derived values.',
        SOURCES.solid.derived,
      ),
      MobX: withRef(
        'Use computed(() => ...) or @computed getters. Cached and lazily re-evaluated when observed state changes.',
        SOURCES.mobx.derived,
      ),
      RxJS: withRef(
        'Compose streams with operators: map, combineLatest, switchMap, etc.',
        SOURCES.rxjs.derived,
      ),
      'Preact Signals': withRef(
        'Use computed(() => ...) signals for derived values.',
        SOURCES.preactSignals.derived,
      ),
    },
  },
  {
    dimension: 'How dependencies are tracked',
    values: {
      'RS-X': withRef(
        'StateManager wraps values in observer proxies. As the expression evaluates, every property read, index access, and function call is recorded. Any proxy mutation triggers re-evaluation of all expressions that touched that path.',
        SOURCES.rsx.tracking,
      ),
      'React (Hooks)': withRef(
        'Manual: dependencies for useEffect and useMemo are explicitly listed in dependency arrays. Missing deps cause stale closures.',
        SOURCES.react.tracking,
      ),
      'Vue 3 Reactivity': withRef(
        'Automatic: reactive reads inside computed/watchEffect are tracked at runtime via Proxy traps.',
        SOURCES.vue.tracking,
      ),
      'Angular Signals': withRef(
        'Automatic: reading a signal() inside a computed() or effect() registers it as a dependency.',
        SOURCES.angular.tracking,
      ),
      Svelte: withRef(
        'Compiler-assisted: Svelte statically analyzes $state/$derived to determine reactive dependencies.',
        SOURCES.svelte.tracking,
      ),
      SolidJS: withRef(
        'Automatic: signals read inside createEffect/createMemo during execution become dependencies.',
        SOURCES.solid.tracking,
      ),
      MobX: withRef(
        'Automatic: observables read inside a tracked function (reaction/computed/observer) are recorded.',
        SOURCES.mobx.tracking,
      ),
      RxJS: withRef(
        'Explicit: all source streams and dependencies are wired manually in operator chains and subscriptions.',
        SOURCES.rxjs.tracking,
      ),
      'Preact Signals': withRef(
        'Automatic: signals read inside computed/effect during evaluation become dependencies.',
        SOURCES.preactSignals.tracking,
      ),
    },
  },
  {
    dimension: 'Nested / chain property tracking',
    values: {
      'RS-X': withRef(
        'Each segment of a path like cart.items[0].qty is tracked individually. Replacing cart.items automatically rebinds [0].qty against the new array — no extra code needed.',
        SOURCES.rsx.nesting,
      ),
      'React (Hooks)': withRef(
        'Manual. Nested deps must be listed explicitly. Replacing a nested object does not rebind child hooks automatically.',
        SOURCES.react.tracking,
      ),
      'Vue 3 Reactivity': withRef(
        'Deep by default for reactive() objects. Replacing a nested object breaks reactivity unless the new object is also reactive.',
        SOURCES.vue.tracking,
      ),
      'Angular Signals': withRef(
        'Signals are flat. Nested tracking requires either deeply nested signals or computed chains written by hand.',
        SOURCES.angular.tracking,
      ),
      Svelte: withRef(
        '$state() is deeply reactive. Mutations to nested properties trigger effects. Object replacement is handled correctly.',
        SOURCES.svelte.tracking,
      ),
      SolidJS: withRef(
        'createSignal is flat. createStore supports deep nested tracking with fine-grained property-level reactivity.',
        SOURCES.solid.store,
      ),
      MobX: withRef(
        'Observable objects/arrays are deeply tracked by default. Accessing any nested property inside a reaction registers it.',
        SOURCES.mobx.tracking,
      ),
      RxJS: withRef(
        'Not applicable. All nested relationships must be wired explicitly with operators like switchMap.',
        SOURCES.rxjs.tracking,
      ),
      'Preact Signals': withRef(
        'Signals are flat. No automatic deep tracking; nested state requires nested signals or a store.',
        SOURCES.preactSignals.tracking,
      ),
    },
  },
  {
    dimension: 'Smallest tracked source unit',
    values: {
      'RS-X': withRef(
        'Individual path segment — a property, array index, Map key, or collection item. Only expressions reading that exact segment re-evaluate.',
        SOURCES.rsx.primitive,
      ),
      'React (Hooks)': withRef(
        'A state value managed by a single useState/useReducer call. Triggers the whole component re-render.',
        SOURCES.react.primitive,
      ),
      'Vue 3 Reactivity': withRef(
        'A single ref value, or a single property on a reactive() object.',
        SOURCES.vue.primitive,
      ),
      'Angular Signals': withRef(
        'A single signal value.',
        SOURCES.angular.primitive,
      ),
      Svelte: withRef(
        'A $state() value or store value.',
        SOURCES.svelte.primitive,
      ),
      SolidJS: withRef(
        'A single signal value (or a store property with createStore).',
        SOURCES.solid.primitive,
      ),
      MobX: withRef(
        'A single observable property or collection item.',
        SOURCES.mobx.primitive,
      ),
      RxJS: withRef('One emitted value on a stream.', SOURCES.rxjs.primitive),
      'Preact Signals': withRef(
        'A single signal value.',
        SOURCES.preactSignals.primitive,
      ),
    },
  },
  {
    dimension: 'What usually re-runs after a change',
    values: {
      'RS-X': withRef(
        'Only expressions whose tracked paths changed re-evaluate. Each fires its changed observable once per change cycle. Unaffected expressions are not touched.',
        SOURCES.rsx.batching,
      ),
      'React (Hooks)': withRef(
        'The component function re-runs (re-render). React then diffs the output and commits DOM changes.',
        SOURCES.react.rerender,
      ),
      'Vue 3 Reactivity': withRef(
        'Dependent computed values, watchers, and components that read the changed reactive value.',
        SOURCES.vue.rerender,
      ),
      'Angular Signals': withRef(
        'Dependent computed signals and effects. Angular components that read those signals update in the next change-detection pass.',
        SOURCES.angular.rerender,
      ),
      Svelte: withRef(
        'Reactive declarations ($derived) and effects ($effect) that depend on the changed state, then affected DOM updates.',
        SOURCES.svelte.rerender,
      ),
      SolidJS: withRef(
        'Dependent effects and memos (and the fine-grained DOM bindings that read them) — no full component re-render.',
        SOURCES.solid.rerender,
      ),
      MobX: withRef(
        'Reactions, computed values, and observer components that read the changed observable.',
        SOURCES.mobx.rerender,
      ),
      RxJS: withRef(
        'Downstream operators and subscribers in the pipeline that are subscribed to the emitting stream.',
        SOURCES.rxjs.rerender,
      ),
      'Preact Signals': withRef(
        'Effects and computed values that depend on the signal, and any DOM bindings in Preact components.',
        SOURCES.preactSignals.rerender,
      ),
    },
  },
  {
    dimension: 'Batching behavior',
    values: {
      'RS-X': withRef(
        'Auto-batched per change cycle via StateManager. Multiple mutations within one synchronous cycle produce one set of changed events. Explicit IExpressionChangeTransactionManager.suspend()/continue() available for manual control.',
        SOURCES.rsx.batching,
      ),
      'React (Hooks)': withRef(
        'React 18 automatically batches all state updates (including async ones). Earlier versions batch only inside event handlers.',
        SOURCES.react.batching,
      ),
      'Vue 3 Reactivity': withRef(
        'DOM updates are queued and flushed asynchronously. nextTick() waits for the pending flush to complete.',
        SOURCES.vue.batching,
      ),
      'Angular Signals': withRef(
        "Signal effects are scheduled by Angular's change-detection cycle, not immediately synchronous.",
        SOURCES.angular.batching,
      ),
      Svelte: withRef(
        'DOM updates are coalesced into one microtask flush. tick() returns a promise that resolves after the pending flush.',
        SOURCES.svelte.batching,
      ),
      SolidJS: withRef(
        'Synchronous by default. Use batch(...) to group multiple signal writes into a single propagation step.',
        SOURCES.solid.batching,
      ),
      MobX: withRef(
        'Actions are transactional: all observable mutations inside an action run before reactions fire.',
        SOURCES.mobx.batching,
      ),
      RxJS: withRef(
        'No automatic batching. Timing and grouping are controlled explicitly via schedulers and operators (e.g. bufferTime, debounceTime).',
        SOURCES.rxjs.batching,
      ),
      'Preact Signals': withRef(
        'batch(...) groups multiple signal updates so effects and renders fire once after the batch completes.',
        SOURCES.preactSignals.batching,
      ),
    },
  },
  {
    dimension: 'Explicit transaction / atomic update API',
    values: {
      'RS-X': withRef(
        'Yes: IExpressionChangeTransactionManager.suspend() pauses all expression change emission; continue() or commit() flushes queued changes atomically.',
        SOURCES.rsx.batching,
      ),
      'React (Hooks)': withRef(
        'No general transaction API. React 18 auto-batches updates; unstable_batchedUpdates is available for edge cases.',
        SOURCES.react.batching,
      ),
      'Vue 3 Reactivity': withRef(
        'No dedicated transaction API. All mutations inside a synchronous function are batched before the next tick flush.',
        SOURCES.vue.batching,
      ),
      'Angular Signals': withRef(
        'No transaction primitive in the public signal API. All signal writes within a synchronous call stack are batched before effects run.',
        SOURCES.angular.batching,
      ),
      Svelte: withRef(
        'No dedicated transaction API. Updates are coalesced automatically within a synchronous execution.',
        SOURCES.svelte.batching,
      ),
      SolidJS: withRef(
        'Yes: batch(...) groups multiple signal writes into one propagation step.',
        SOURCES.solid.batching,
      ),
      MobX: withRef(
        'Yes: action / runInAction provide transactional semantics — reactions fire only after the action body completes.',
        SOURCES.mobx.batching,
      ),
      RxJS: withRef(
        'No built-in transaction primitive. Grouping is done with stream operators.',
        SOURCES.rxjs.derived,
      ),
      'Preact Signals': withRef(
        'Yes: batch(...) groups multiple signal updates so subscribers fire once.',
        SOURCES.preactSignals.batching,
      ),
    },
  },
  {
    dimension: 'How async data fits in',
    values: {
      'RS-X': withRef(
        "First-class. Promises and Observables can appear directly in expression paths — rsx('a + b')(model) works if b is an Observable. The expression resolves the latest emitted value and re-evaluates when it changes. No extra glue code or adapter needed.",
        SOURCES.rsx.async,
      ),
      'React (Hooks)': withRef(
        'Async work runs in effects or event handlers and then calls setState. React 18 Suspense handles async rendering boundaries but not arbitrary formula binding.',
        SOURCES.react.tracking,
      ),
      'Vue 3 Reactivity': withRef(
        'Async work runs outside reactivity and updates ref/reactive values when it resolves. Watchers can be async. Vue 3.5 introduced useAsyncState helpers.',
        SOURCES.vue.rerender,
      ),
      'Angular Signals': withRef(
        'Angular 17+ resource() creates async signals. Async work typically updates signals inside effects or via RxJS interop (toSignal).',
        SOURCES.angular.rerender,
      ),
      Svelte: withRef(
        'Async work updates $state values when it resolves. Svelte 5 await blocks handle async rendering.',
        SOURCES.svelte.rerender,
      ),
      SolidJS: withRef(
        'createResource wraps async data sources (fetch, signals) and exposes loading/error/data states reactively.',
        'https://docs.solidjs.com/reference/basic-reactivity/create-resource',
      ),
      MobX: withRef(
        'Async steps update observables inside runInAction after each await. MobX Flow provides a coroutine-like async action model.',
        SOURCES.mobx.batching,
      ),
      RxJS: withRef(
        'Async and time-based behavior is native to streams. Any async source can be modelled as an Observable.',
        SOURCES.rxjs.primitive,
      ),
      'Preact Signals': withRef(
        'Async work updates signal values when it resolves. No built-in async signal primitive; typically combined with useEffect or a library.',
        SOURCES.preactSignals.overview,
      ),
    },
  },
  {
    dimension: 'Cleanup model',
    values: {
      'RS-X': withRef(
        'Call expression.dispose() to release all StateManager watchers and RxJS subscriptions. Forgetting to dispose is the most common source of leaks.',
        SOURCES.rsx.cleanup,
      ),
      'React (Hooks)': withRef(
        'useEffect can return a cleanup function that runs when the effect re-fires or the component unmounts.',
        SOURCES.react.cleanup,
      ),
      'Vue 3 Reactivity': withRef(
        'watchEffect/watch return stop handles. Watchers created inside setup() are automatically stopped on component unmount.',
        SOURCES.vue.cleanup,
      ),
      'Angular Signals': withRef(
        'Effects created in an injection context are automatically destroyed with that context (component/service lifetime).',
        SOURCES.angular.cleanup,
      ),
      Svelte: withRef(
        '$effect can return a teardown function. Effects are automatically cleaned up when the component is destroyed.',
        SOURCES.svelte.cleanup,
      ),
      SolidJS: withRef(
        'onCleanup(...) registers a function that runs when the owning scope (component/effect) is disposed.',
        SOURCES.solid.cleanup,
      ),
      MobX: withRef(
        'reaction/autorun return disposer functions and must be called manually when no longer needed.',
        SOURCES.mobx.cleanup,
      ),
      RxJS: withRef(
        'Subscriptions must be explicitly unsubscribed. Alternatively use takeUntil, take(1), or async pipe in Angular templates.',
        SOURCES.rxjs.cleanup,
      ),
      'Preact Signals': withRef(
        'effect(...) returns a disposer function. Call it to stop the effect and clean up subscriptions.',
        SOURCES.preactSignals.cleanup,
      ),
    },
  },
  {
    dimension: 'Runtime expression parsing from strings',
    values: {
      'RS-X': withRef(
        "Yes — a primary differentiator. rsx('price * qty - discount')(model) is parsed at runtime with no build step, compiler plugin, or code generation required. Useful for spreadsheet-like formulas, rule engines, and user-defined expressions.",
        SOURCES.rsx.parsing,
      ),
      'React (Hooks)': withRef(
        'No built-in runtime parser. Formulas must be written as JavaScript functions.',
        SOURCES.react.parsing,
      ),
      'Vue 3 Reactivity': withRef(
        'Template expressions are compiled at build time; no runtime parser for arbitrary formula strings.',
        SOURCES.vue.parsing,
      ),
      'Angular Signals': withRef(
        'Template expressions are compiled at build time; no runtime parser for arbitrary formula strings.',
        SOURCES.angular.parsing,
      ),
      Svelte: withRef(
        'Expressions in templates are compiled at build time by the Svelte compiler; no runtime parser.',
        SOURCES.svelte.parsing,
      ),
      SolidJS: withRef(
        'No built-in runtime parser for formula strings.',
        SOURCES.solid.parsing,
      ),
      MobX: withRef(
        'No built-in runtime parser. Derivations are written as JavaScript functions.',
        SOURCES.mobx.parsing,
      ),
      RxJS: withRef(
        'No built-in runtime parser. Streams are composed in code.',
        SOURCES.rxjs.parsing,
      ),
      'Preact Signals': withRef(
        'No built-in runtime parser for arbitrary formula strings.',
        SOURCES.preactSignals.parsing,
      ),
    },
  },
  {
    dimension: 'TypeScript support',
    values: {
      'RS-X': withRef(
        "TypeScript-first. rsx<T>('expr')(model) carries the declared return type. All interfaces, injection tokens, and change payloads are typed.",
        SOURCES.rsx.ts,
      ),
      'React (Hooks)': withRef(
        'Full TypeScript support. Hooks and component props are typed via generics.',
        SOURCES.react.overview,
      ),
      'Vue 3 Reactivity': withRef(
        'Full TypeScript support. ref<T>(), computed<T>(), and defineComponent are typed. Best with <script setup lang="ts">.',
        SOURCES.vue.overview,
      ),
      'Angular Signals': withRef(
        'TypeScript-first. Angular is built in TypeScript; signal<T>() and computed<T>() infer types.',
        SOURCES.angular.overview,
      ),
      Svelte: withRef(
        'TypeScript supported in <script lang="ts"> blocks. $state<T>() and $derived<T>() infer types.',
        SOURCES.svelte.overview,
      ),
      SolidJS: withRef(
        'TypeScript-first. createSignal<T>() and createMemo<T>() infer types.',
        SOURCES.solid.overview,
      ),
      MobX: withRef(
        'Good TypeScript support. Decorator-based usage requires experimentalDecorators in tsconfig.',
        SOURCES.mobx.overview,
      ),
      RxJS: withRef(
        'TypeScript-first. Operators preserve and transform Observable<T> types through the pipeline.',
        SOURCES.rxjs.overview,
      ),
      'Preact Signals': withRef(
        'TypeScript-first. signal<T>() and computed<T>() are fully typed.',
        SOURCES.preactSignals.overview,
      ),
    },
  },
  {
    dimension: 'Debugging / tooling',
    values: {
      'RS-X': withRef(
        'Online playground with live evaluation. IExpressionChangeTrackerManager records and replays change history. expression.changeHook provides per-expression diagnostics. ExpressionChangeTrackerManager for structured audit trails.',
        SOURCES.rsx.tooling,
      ),
      'React (Hooks)': withRef(
        'React Developer Tools browser extension: component tree, props/state inspection, profiler.',
        SOURCES.react.tooling,
      ),
      'Vue 3 Reactivity': withRef(
        'Vue DevTools browser extension: component tree, reactive state inspection, timeline.',
        SOURCES.vue.tooling,
      ),
      'Angular Signals': withRef(
        'Angular DevTools browser extension: component tree, change detection profiler.',
        SOURCES.angular.tooling,
      ),
      Svelte: withRef(
        '@debug tag for reactive value logging in templates. Svelte DevTools extension available.',
        SOURCES.svelte.tooling,
      ),
      SolidJS: withRef(
        'Solid DevTools browser extension available for component and signal inspection.',
        SOURCES.solid.tooling,
      ),
      MobX: withRef(
        'spy() and trace() APIs for runtime reaction inspection. MobX DevTools available for React.',
        SOURCES.mobx.tooling,
      ),
      RxJS: withRef(
        'Marble testing for time-based stream testing. rxjs-spy and RxViz for stream visualization.',
        SOURCES.rxjs.tooling,
      ),
      'Preact Signals': withRef(
        'Preact DevTools extension. Signals integrate with the same component inspection flow.',
        SOURCES.preactSignals.tooling,
      ),
    },
  },
];

export default function FeaturesPage() {
  return (
    <main id="content" className="main">
      <section className="quickstartSection">
        <div className="container">
          <FeaturesComparisonClient
            rsxKey={RSX_KEY}
            frameworks={FRAMEWORKS}
            rows={COMPARISON_ROWS}
          />
        </div>
      </section>
    </main>
  );
}
