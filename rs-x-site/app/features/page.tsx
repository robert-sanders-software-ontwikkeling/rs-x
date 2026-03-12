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

const COMPARISON_ROWS: IComparisonRow[] = [
  {
    dimension: 'Primary purpose',
    values: {
      'RS-X':
        'Runtime-bound expression engine for fine-grained model reactivity',
      'React (Hooks)': 'UI rendering library',
      'Vue 3 Reactivity': 'UI reactivity system',
      'Angular Signals': 'Fine-grained UI reactivity',
      Svelte: 'Compile-time UI reactivity',
      SolidJS: 'Fine-grained UI reactivity',
      MobX: 'UI state management',
      RxJS: 'General-purpose reactive streams',
      'Preact Signals': 'Fine-grained UI reactivity',
    },
  },
  {
    dimension: 'Reactive primitive',
    values: {
      'RS-X':
        'Identifier (field, map key, array element, etc.) registered in the StateManager by an expression',
      'React (Hooks)': 'Component state value',
      'Vue 3 Reactivity': 'Ref / Reactive object (Proxy)',
      'Angular Signals': 'Signal',
      Svelte: 'Reactive assignment (compiler-instrumented) / Store',
      SolidJS: 'Signal',
      MobX: 'Observable value (observable() / makeAutoObservable)',
      RxJS: 'Observable stream',
      'Preact Signals': 'Signal',
    },
  },
  {
    dimension: 'Subscriber type',
    values: {
      'RS-X': 'Bound IExpression instance',
      'React (Hooks)': 'Component render (scheduled by state update)',
      'Vue 3 Reactivity': 'Effect / Watcher',
      'Angular Signals': 'Effect / Computed',
      Svelte: 'Component update block',
      SolidJS: 'Effect / Computed',
      MobX: 'Reaction',
      RxJS: 'Subscriber',
      'Preact Signals': 'Effect',
    },
  },
  {
    dimension: 'Smallest reactive unit',
    values: {
      'RS-X': 'Identifier',
      'React (Hooks)': 'Component state value',
      'Vue 3 Reactivity': 'Ref value or reactive property',
      'Angular Signals': 'Signal value',
      Svelte: 'Instrumented assignment / store value',
      SolidJS: 'Signal value',
      MobX: 'Observable property/value',
      RxJS: 'Stream emission',
      'Preact Signals': 'Signal value',
    },
  },
  {
    dimension: 'What registers dependencies',
    values: {
      'RS-X':
        'Binding the expression to a model registers all identifiers (fields/map keys/array indices) the expression depends on in the StateManager',
      'React (Hooks)': 'Component render execution',
      'Vue 3 Reactivity': 'Proxy property access during effect execution',
      'Angular Signals': 'Signal read during computation',
      Svelte: 'Compile-time assignment analysis',
      SolidJS: 'Signal read during computation',
      MobX: 'Proxy property access',
      RxJS: 'Subscription to stream',
      'Preact Signals': 'Signal read during computation',
    },
  },
  {
    dimension: 'What becomes reactive',
    values: {
      'RS-X': 'Only identifiers accessed by the bound expression',
      'React (Hooks)': 'Entire component re-renders',
      'Vue 3 Reactivity': 'Accessed properties',
      'Angular Signals': 'Individual signals',
      Svelte: 'Reactive assignments',
      SolidJS: 'Individual signals',
      MobX: 'Decorated properties',
      RxJS: 'Entire stream',
      'Preact Signals': 'Individual signals',
    },
  },
  {
    dimension: 'How updates propagate',
    values: {
      'RS-X': 'Identifier mutation → StateManager → dependent expressions',
      'React (Hooks)': 'State setter → component re-render',
      'Vue 3 Reactivity': 'Proxy mutation → effects',
      'Angular Signals': 'Signal set → dependents notified',
      Svelte: 'Assignment → update',
      SolidJS: 'Signal set → dependents notified',
      MobX: 'Property mutation → observers',
      RxJS: 'Stream emits → subscribers',
      'Preact Signals': 'Signal set → dependents',
    },
  },
  {
    dimension: 'Reactivity granularity',
    values: {
      'RS-X': 'Per identifier',
      'React (Hooks)': 'Per component',
      'Vue 3 Reactivity': 'Per property',
      'Angular Signals': 'Per signal',
      Svelte: 'Per assignment',
      SolidJS: 'Per signal',
      MobX: 'Per property',
      RxJS: 'Per stream',
      'Preact Signals': 'Per signal',
    },
  },
  {
    dimension: 'Reactive graph scope',
    values: {
      'RS-X':
        'Per expression instance (isolated reactive graph; identifiers shared via reference counting in StateManager)',
      'React (Hooks)': 'Component tree (no implicit fine-grained graph)',
      'Vue 3 Reactivity':
        'Shared runtime graph; scoped by component instance/effect scope',
      'Angular Signals':
        'Shared runtime graph; scoped by injection/context + component lifecycle',
      Svelte: 'Component scope (compiled updates) + store graphs',
      SolidJS:
        'Shared runtime graph; scoped by owner/root (component, createRoot)',
      MobX: 'Shared runtime graph; scoped by reactions/derivations',
      RxJS: 'Per stream chain',
      'Preact Signals': 'Shared runtime graph; scoped by component/root',
    },
  },
  {
    dimension: 'Independent reactive graphs over same model',
    values: {
      'RS-X':
        'Yes. Each binding creates its own isolated reactive graph while sharing identifiers via reference counting.',
      'React (Hooks)': 'No (render is unit; isolation via components only)',
      'Vue 3 Reactivity': 'Yes. (separate component/effect scopes)',
      'Angular Signals': 'Yes. (scoped via DI/context boundaries)',
      Svelte: 'Yes. (per component/store)',
      SolidJS: 'Yes (separate roots/owners)',
      MobX: 'Yes (separate reactions/derivations; manual disposal)',
      RxJS: 'Not implicit (streams must be modeled explicitly)',
      'Preact Signals': 'Yes (separate roots/components; manual disposal)',
    },
  },
  {
    dimension: 'Automatic cleanup of bindings',
    values: {
      'RS-X':
        'Disposing an expression removes its bindings. When no expressions reference an identifier, the StateManager removes reactive patches/proxies (reference-counted).',
      'React (Hooks)': 'N/A',
      'Vue 3 Reactivity': 'Yes (component-scoped)',
      'Angular Signals': 'Yes (lifecycle-scoped)',
      Svelte: 'Yes (component-scoped)',
      SolidJS: 'Yes (owner/root disposal)',
      MobX: 'Requires disposal of reactions',
      RxJS: 'Requires unsubscribe',
      'Preact Signals': 'Yes (lifecycle-scoped)',
    },
  },
  {
    dimension: 'Built-in computation change tracking',
    values: {
      'RS-X':
        'Yes. Create change tracker via ExpressionChangeTrackerManager (emits change history stacks) or use expression.changeHook for custom tracking',
      'React (Hooks)': 'No',
      'Vue 3 Reactivity': 'No',
      'Angular Signals': 'No',
      Svelte: 'No',
      SolidJS: 'No',
      MobX: 'No',
      RxJS: 'No',
      'Preact Signals': 'No',
    },
  },
  {
    dimension: 'Expression parsing / compilation strategy',
    values: {
      'RS-X':
        'Expressions parsed once into cached AST; multiple bindings reuse AST while creating isolated reactive graphs',
      'React (Hooks)': 'N/A',
      'Vue 3 Reactivity': 'N/A',
      'Angular Signals': 'N/A',
      Svelte: 'N/A',
      SolidJS: 'N/A',
      MobX: 'N/A',
      RxJS: 'N/A',
      'Preact Signals': 'N/A',
    },
  },
  {
    dimension: 'Expression modularity / composition',
    values: {
      'RS-X':
        'Yes. Expressions are parsed independently and composable; cached AST reused; shared expressions evaluated once per dependency change',
      'React (Hooks)': 'Component-based',
      'Vue 3 Reactivity': 'Computed-based composition',
      'Angular Signals': 'Manual composition',
      Svelte: 'Reactive block composition',
      SolidJS: 'Manual composition',
      MobX: 'Computed-based',
      RxJS: 'Operator-based composition',
      'Preact Signals': 'Manual composition',
    },
  },
  {
    dimension: 'Adaptable identifier resolution strategy',
    values: {
      'RS-X':
        'Yes. Identifier resolution is pluggable. By default, identifiers resolve against the bound model and global scope (for example, Math or Date). But if you want, you can also resolve via a DOM ancestor path or custom context by implementing a custom identifier resolver.',
      'React (Hooks)': 'No',
      'Vue 3 Reactivity': 'No',
      'Angular Signals': 'No',
      Svelte: 'No',
      SolidJS: 'No',
      MobX: 'No',
      RxJS: 'N/A',
      'Preact Signals': 'No',
    },
  },
  {
    dimension: 'Supports runtime expression parsing (string / AST input)',
    values: {
      'RS-X': 'Yes',
      'React (Hooks)': 'No',
      'Vue 3 Reactivity': 'No',
      'Angular Signals': 'No',
      Svelte: 'No',
      SolidJS: 'No',
      MobX: 'No',
      RxJS: 'No',
      'Preact Signals': 'No',
    },
  },
  {
    dimension: 'Primary architecture target: rule-based systems',
    values: {
      'RS-X':
        'Designed for any data-driven system where behavior reacts to changing values. Examples: business rules (recompute eligibility/pricing when inputs change), UI derivations (update computed view state from model changes), workflow automation (trigger next step when conditions become true), validation engines (re-evaluate constraints on field updates), and monitoring/alerting (emit notifications when threshold expressions change).',
      'React (Hooks)': 'No',
      'Vue 3 Reactivity': 'No',
      'Angular Signals': 'No',
      Svelte: 'No',
      SolidJS: 'No',
      MobX: 'No',
      RxJS: 'No',
      'Preact Signals': 'No',
    },
  },
  {
    dimension: 'Designed primarily for UI state management',
    values: {
      'RS-X':
        'Generic reactive engine that supports UI change detection but is not limited to UI frameworks.',
      'React (Hooks)': 'Yes',
      'Vue 3 Reactivity': 'Yes',
      'Angular Signals': 'Yes',
      Svelte: 'Yes',
      SolidJS: 'Yes',
      MobX: 'Yes',
      RxJS: 'Secondary use case',
      'Preact Signals': 'Yes',
    },
  },
  {
    dimension: 'Scheduling / batching model',
    values: {
      'RS-X':
        'Changes are pushed directly to subscribers, so no scheduler is required by default. For batching, use IExpressionChangeTransactionManager to suspend() and continue() change emission.',
      'React (Hooks)': 'Concurrent scheduler',
      'Vue 3 Reactivity': 'Batched via job queue/nextTick',
      'Angular Signals': 'Integrated with Angular change detection',
      Svelte: 'Compiler-controlled',
      SolidJS: 'Synchronous by default; optional batching',
      MobX: 'Typically synchronous; configurable',
      RxJS: 'Scheduler/operator dependent',
      'Preact Signals': 'Typically synchronous',
    },
  },
  {
    dimension: 'Transaction / atomic update support',
    values: {
      'RS-X':
        'Yes. Using IExpressionChangeTransactionManager allows suspending change emission and resuming it, enabling atomic mutation batches with a single consolidated change notification.',
      'React (Hooks)': 'Yes (batched updates)',
      'Vue 3 Reactivity': 'Yes (batched flush cycle)',
      'Angular Signals': 'Limited / pattern-based',
      Svelte: 'Yes (coalesced assignments)',
      SolidJS: 'Batching patterns',
      MobX: 'Yes (actions / runInAction)',
      RxJS: 'Modeled via stream operators',
      'Preact Signals': 'Limited / pattern-based',
    },
  },
  {
    dimension: 'Async boundary behavior',
    values: {
      'RS-X':
        'No special async boundary in user code. Async and sync values are handled transparently, so you can mix them in the same expression (for example, a + b where a and b can each be async or sync) and updates propagate the same way.',
      'React (Hooks)': 'Async schedules re-render',
      'Vue 3 Reactivity': 'Async triggers reactive flush',
      'Angular Signals': 'Async via zones/lifecycle',
      Svelte: 'Async triggers update',
      SolidJS: 'Async updates re-trigger signals',
      MobX: 'Async notifies observers',
      RxJS: 'First-class async',
      'Preact Signals': 'Async notifies dependents',
    },
  },
  {
    dimension: 'Debuggability / devtools',
    values: {
      'RS-X':
        'Change tracker history plus expression hooks for introspection and custom tooling.',
      'React (Hooks)': 'React DevTools',
      'Vue 3 Reactivity': 'Vue DevTools',
      'Angular Signals': 'Angular DevTools',
      Svelte: 'Svelte DevTools',
      SolidJS: 'Solid DevTools',
      MobX: 'MobX DevTools',
      RxJS: 'Marble testing/logging',
      'Preact Signals': 'Ecosystem tools',
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
