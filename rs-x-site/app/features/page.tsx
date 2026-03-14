import {
  FeaturesComparisonClient,
  type IComparisonRow,
} from './features-comparison.client';

export const metadata = {
  title: 'Features',
  description: 'Compare RS-X features with other frameworks.',
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
    primitive: '/docs/observation',
    derived: '/docs/rsx-function',
    tracking: '/docs/observation',
    batching: '/docs/expression-change-transaction-manager',
    async: '/docs/core-concepts/async-operations',
    cleanup: '/docs/iexpression',
    parsing: '/docs/rsx-function',
    tooling: '/docs/expression-change-tracker-manager',
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
    primitive: 'https://docs.solidjs.com/reference/basic-reactivity/create-signal',
    derived: 'https://docs.solidjs.com/reference/basic-reactivity/create-memo',
    tracking: 'https://docs.solidjs.com/reference/basic-reactivity/create-effect',
    rerender: 'https://docs.solidjs.com/reference/basic-reactivity/create-effect',
    batching: 'https://docs.solidjs.com/reference/reactive-utilities/batch',
    cleanup: 'https://docs.solidjs.com/reference/lifecycle/on-cleanup',
    parsing: 'https://docs.solidjs.com/concepts/intro-to-reactivity',
    tooling: 'https://docs.solidjs.com/concepts/intro-to-reactivity',
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
        'A general reactive expression engine for models and rules (not only UI).',
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
        'A full framework; signals are Angular\'s fine-grained reactive model.',
        SOURCES.angular.overview,
      ),
      Svelte: withRef(
        'A UI framework with compiler-assisted reactivity and runes.',
        SOURCES.svelte.overview,
      ),
      SolidJS: withRef(
        'A UI library focused on fine-grained reactive updates.',
        SOURCES.solid.overview,
      ),
      MobX: withRef(
        'A state management library based on observables, derivations, and reactions.',
        SOURCES.mobx.overview,
      ),
      RxJS: withRef(
        'A reactive streams library for async and event-based data flows.',
        SOURCES.rxjs.overview,
      ),
      'Preact Signals': withRef(
        'A signal-based reactive model typically used with Preact UI updates.',
        SOURCES.preactSignals.overview,
      ),
    },
  },
  {
    dimension: 'Main reactive building block',
    values: {
      'RS-X': withRef(
        'Identifiers read by an expression (field, key, index).',
        SOURCES.rsx.primitive,
      ),
      'React (Hooks)': withRef(
        'Hook state values (for example useState or useReducer).',
        SOURCES.react.primitive,
      ),
      'Vue 3 Reactivity': withRef(
        'ref(...) values and reactive(...) proxy properties.',
        SOURCES.vue.primitive,
      ),
      'Angular Signals': withRef(
        'signal(...) values (writable or computed).',
        SOURCES.angular.primitive,
      ),
      Svelte: withRef(
        '$state(...) values (or stores in store-based patterns).',
        SOURCES.svelte.primitive,
      ),
      SolidJS: withRef('createSignal(...) values.', SOURCES.solid.primitive),
      MobX: withRef(
        'Observable state (objects, arrays, maps, primitives).',
        SOURCES.mobx.primitive,
      ),
      RxJS: withRef('Observable streams.', SOURCES.rxjs.primitive),
      'Preact Signals': withRef(
        'signal(...) values.',
        SOURCES.preactSignals.primitive,
      ),
    },
  },
  {
    dimension: 'How you define derived values',
    values: {
      'RS-X': withRef(
        'Define expressions as strings and compose expression instances.',
        SOURCES.rsx.derived,
      ),
      'React (Hooks)': withRef(
        'Compute during render, or memoize with useMemo.',
        SOURCES.react.derived,
      ),
      'Vue 3 Reactivity': withRef(
        'Use computed(...) for cached derived values.',
        SOURCES.vue.derived,
      ),
      'Angular Signals': withRef(
        'Use computed(...) signals for derived state.',
        SOURCES.angular.derived,
      ),
      Svelte: withRef('Use $derived(...) for derived values.', SOURCES.svelte.derived),
      SolidJS: withRef('Use createMemo(...) for derived values.', SOURCES.solid.derived),
      MobX: withRef('Use computed values for derived state.', SOURCES.mobx.derived),
      RxJS: withRef(
        'Compose streams with operators (map, combineLatest, etc.).',
        SOURCES.rxjs.derived,
      ),
      'Preact Signals': withRef(
        'Use computed(...) signals for derived values.',
        SOURCES.preactSignals.derived,
      ),
    },
  },
  {
    dimension: 'How dependencies are tracked',
    values: {
      'RS-X': withRef(
        'The parser/runtime records which identifiers each expression reads.',
        SOURCES.rsx.tracking,
      ),
      'React (Hooks)': withRef(
        'Dependencies for effects/memos are listed explicitly in dependency arrays.',
        SOURCES.react.tracking,
      ),
      'Vue 3 Reactivity': withRef(
        'Reactive reads are tracked when effects/computed/watchers run.',
        SOURCES.vue.tracking,
      ),
      'Angular Signals': withRef(
        'Reading a signal inside computed/effect tracks that dependency.',
        SOURCES.angular.tracking,
      ),
      Svelte: withRef(
        'Runes and reactive code paths are tracked by Svelte\'s compile/runtime model.',
        SOURCES.svelte.tracking,
      ),
      SolidJS: withRef(
        'Signals read inside createEffect/createMemo become dependencies.',
        SOURCES.solid.tracking,
      ),
      MobX: withRef(
        'Reactions track observables read during tracked functions.',
        SOURCES.mobx.tracking,
      ),
      RxJS: withRef(
        'Dependencies are explicit in stream composition and subscription wiring.',
        SOURCES.rxjs.tracking,
      ),
      'Preact Signals': withRef(
        'Signals read in computed/effect/component render are tracked.',
        SOURCES.preactSignals.tracking,
      ),
    },
  },
  {
    dimension: 'Smallest tracked source unit',
    values: {
      'RS-X': withRef(
        'Identifier level (field/key/index/member segment).',
        SOURCES.rsx.primitive,
      ),
      'React (Hooks)': withRef('State value used by a component.', SOURCES.react.primitive),
      'Vue 3 Reactivity': withRef(
        'A ref value or one reactive object property.',
        SOURCES.vue.primitive,
      ),
      'Angular Signals': withRef('A single signal value.', SOURCES.angular.primitive),
      Svelte: withRef('A state rune value (or store value).', SOURCES.svelte.primitive),
      SolidJS: withRef('A single signal value.', SOURCES.solid.primitive),
      MobX: withRef('Observable property/value.', SOURCES.mobx.primitive),
      RxJS: withRef('One emitted stream value.', SOURCES.rxjs.primitive),
      'Preact Signals': withRef('A single signal value.', SOURCES.preactSignals.primitive),
    },
  },
  {
    dimension: 'What usually re-runs after a change',
    values: {
      'RS-X': withRef(
        'Only expressions that depend on changed paths re-evaluate, and they emit when committed.',
        SOURCES.rsx.batching,
      ),
      'React (Hooks)': withRef('The component function re-runs (re-render).', SOURCES.react.rerender),
      'Vue 3 Reactivity': withRef(
        'Dependent computed, watchers, and component updates.',
        SOURCES.vue.rerender,
      ),
      'Angular Signals': withRef(
        'Dependent computed/effect logic and Angular views that read those signals.',
        SOURCES.angular.rerender,
      ),
      Svelte: withRef(
        'Reactive declarations/effects and affected DOM updates.',
        SOURCES.svelte.rerender,
      ),
      SolidJS: withRef(
        'Dependent effects/memos (and affected DOM bindings).',
        SOURCES.solid.rerender,
      ),
      MobX: withRef(
        'Reactions and observers that read changed observables.',
        SOURCES.mobx.rerender,
      ),
      RxJS: withRef(
        'Subscribers in the stream pipeline receive the next emission.',
        SOURCES.rxjs.rerender,
      ),
      'Preact Signals': withRef(
        'Effects and UI reads that depend on the signal.',
        SOURCES.preactSignals.rerender,
      ),
    },
  },
  {
    dimension: 'Batching behavior',
    values: {
      'RS-X': withRef(
        'Auto-batched by change cycle; explicit suspend()/continue() is available.',
        SOURCES.rsx.batching,
      ),
      'React (Hooks)': withRef('State updates are batched before render commit.', SOURCES.react.batching),
      'Vue 3 Reactivity': withRef(
        'Updates are queued and flushed; nextTick waits for that flush.',
        SOURCES.vue.batching,
      ),
      'Angular Signals': withRef(
        'Signal effects run during Angular\'s change-detection cycle.',
        SOURCES.angular.batching,
      ),
      Svelte: withRef(
        'Updates are coalesced; tick() waits for the next DOM flush.',
        SOURCES.svelte.batching,
      ),
      SolidJS: withRef('Synchronous by default, with explicit batch(...) support.', SOURCES.solid.batching),
      MobX: withRef(
        'Actions are transactional: reactions run after the action completes.',
        SOURCES.mobx.batching,
      ),
      RxJS: withRef(
        'Timing and batching are controlled via schedulers/operators.',
        SOURCES.rxjs.batching,
      ),
      'Preact Signals': withRef('Signals support batch(...) to group updates.', SOURCES.preactSignals.batching),
    },
  },
  {
    dimension: 'Explicit transaction / atomic update API',
    values: {
      'RS-X': withRef(
        'Yes: IExpressionChangeTransactionManager can pause and resume emission.',
        SOURCES.rsx.batching,
      ),
      'React (Hooks)': withRef(
        'No general transaction API; batching is built into React updates.',
        SOURCES.react.batching,
      ),
      'Vue 3 Reactivity': withRef(
        'No dedicated transaction API; updates are batched by the scheduler.',
        SOURCES.vue.batching,
      ),
      'Angular Signals': withRef(
        'No separate transaction primitive in the public signal API.',
        SOURCES.angular.batching,
      ),
      Svelte: withRef(
        'No dedicated transaction API; updates are coalesced by the update cycle.',
        SOURCES.svelte.batching,
      ),
      SolidJS: withRef('Yes: batch(...) groups multiple writes into one propagation step.', SOURCES.solid.batching),
      MobX: withRef('Yes: actions / runInAction provide transactional updates.', SOURCES.mobx.batching),
      RxJS: withRef(
        'No built-in transaction primitive; model grouping with stream operators.',
        SOURCES.rxjs.derived,
      ),
      'Preact Signals': withRef('Yes: batch(...) groups multiple signal updates.', SOURCES.preactSignals.batching),
    },
  },
  {
    dimension: 'How async data fits in',
    values: {
      'RS-X': withRef(
        'Promises, Observables, and expression values can be mixed in one expression. They are handled transparently, so users do not need extra glue code.',
        SOURCES.rsx.async,
      ),
      'React (Hooks)': withRef(
        'Async work is done in user code (events/effects), then state is set.',
        SOURCES.react.tracking,
      ),
      'Vue 3 Reactivity': withRef(
        'Async work updates refs/reactive state; watchers/effects react afterward.',
        SOURCES.vue.rerender,
      ),
      'Angular Signals': withRef(
        'Async work updates signals/resources, then dependents update.',
        SOURCES.angular.rerender,
      ),
      Svelte: withRef(
        'Async work updates state; reactive declarations/effects then rerun.',
        SOURCES.svelte.rerender,
      ),
      SolidJS: withRef(
        'Async sources are commonly handled with createResource or user code.',
        'https://docs.solidjs.com/reference/basic-reactivity/create-resource',
      ),
      MobX: withRef(
        'Async steps usually update observables inside actions/runInAction.',
        SOURCES.mobx.batching,
      ),
      RxJS: withRef('Async and time-based behavior is native to streams.', SOURCES.rxjs.primitive),
      'Preact Signals': withRef(
        'Async work updates signals when values resolve.',
        SOURCES.preactSignals.overview,
      ),
    },
  },
  {
    dimension: 'Cleanup model',
    values: {
      'RS-X': withRef(
        'Dispose the expression to release watchers and subscriptions.',
        SOURCES.rsx.cleanup,
      ),
      'React (Hooks)': withRef(
        'Effects can return cleanup functions that run on re-run/unmount.',
        SOURCES.react.cleanup,
      ),
      'Vue 3 Reactivity': withRef(
        'Watchers can be stopped; component-scoped effects are cleaned up on unmount.',
        SOURCES.vue.cleanup,
      ),
      'Angular Signals': withRef(
        'Effects created in injection context are destroyed with that context.',
        SOURCES.angular.cleanup,
      ),
      Svelte: withRef('$effect can return teardown cleanup logic.', SOURCES.svelte.cleanup),
      SolidJS: withRef('Use onCleanup(...) to dispose side effects/subscriptions.', SOURCES.solid.cleanup),
      MobX: withRef(
        'Reactions return disposers and should be disposed when no longer needed.',
        SOURCES.mobx.cleanup,
      ),
      RxJS: withRef(
        'Subscriptions must be unsubscribed to stop emissions and cleanup work.',
        SOURCES.rxjs.cleanup,
      ),
      'Preact Signals': withRef('effect(...) returns a disposer function.', SOURCES.preactSignals.cleanup),
    },
  },
  {
    dimension: 'Runtime expression parsing from strings',
    values: {
      'RS-X': withRef(
        'Yes. Expressions are parsed at runtime and bound to a model.',
        SOURCES.rsx.parsing,
      ),
      'React (Hooks)': withRef(
        'No built-in runtime parser for formula strings.',
        SOURCES.react.parsing,
      ),
      'Vue 3 Reactivity': withRef(
        'No built-in runtime parser for arbitrary formula strings.',
        SOURCES.vue.parsing,
      ),
      'Angular Signals': withRef(
        'No built-in runtime parser for arbitrary formula strings.',
        SOURCES.angular.parsing,
      ),
      Svelte: withRef(
        'No built-in runtime parser for arbitrary formula strings.',
        SOURCES.svelte.parsing,
      ),
      SolidJS: withRef(
        'No built-in runtime parser for arbitrary formula strings.',
        SOURCES.solid.parsing,
      ),
      MobX: withRef(
        'No built-in runtime parser for arbitrary formula strings.',
        SOURCES.mobx.parsing,
      ),
      RxJS: withRef(
        'No built-in runtime parser for formula strings; streams are composed in code.',
        SOURCES.rxjs.parsing,
      ),
      'Preact Signals': withRef(
        'No built-in runtime parser for arbitrary formula strings.',
        SOURCES.preactSignals.parsing,
      ),
    },
  },
  {
    dimension: 'Debugging / tooling',
    values: {
      'RS-X': withRef(
        'Built-in change-tracking helpers and hooks for expression introspection.',
        SOURCES.rsx.tooling,
      ),
      'React (Hooks)': withRef('React Developer Tools.', SOURCES.react.tooling),
      'Vue 3 Reactivity': withRef('Vue DevTools.', SOURCES.vue.tooling),
      'Angular Signals': withRef('Angular DevTools.', SOURCES.angular.tooling),
      Svelte: withRef(
        'Built-in debug primitives such as @debug (plus ecosystem tooling).',
        SOURCES.svelte.tooling,
      ),
      SolidJS: withRef(
        'Ecosystem tooling (for example devtools packages).',
        SOURCES.solid.tooling,
      ),
      MobX: withRef(
        'Runtime inspection helpers (for example tracing/spy APIs).',
        SOURCES.mobx.tooling,
      ),
      RxJS: withRef(
        'Debugging typically uses logging and marble-style testing.',
        SOURCES.rxjs.tooling,
      ),
      'Preact Signals': withRef(
        'Signals/Preact ecosystem tooling and debug patterns.',
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
