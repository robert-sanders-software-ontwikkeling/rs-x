
import dedent from 'dedent';
import { notFound } from 'next/navigation';


import React from 'react';
import { DocsApiPageTemplate } from '../../../../components/DocsApiPageTemplate';
import { parseDeclarationMembers, readFullTypeDeclaration, SymbolDocumentation } from '../../components/api-member';
import {
  stateManagerApiBySymbol
} from '../state-manager-api.helpers';

const STATE_MANAGER_GITHUB_BASE =
  'https://github.com/robert-sanders-software-ontwikkeling/rs-x/blob/main/rs-x-state-manager/lib';





const MODULE_DETAILS: Record<string, string> = {
  'state-manager':
    'Primary runtime implementation for watched-state registration, subscription management, change emission, and context rebinding.',
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
      'Observable stream that emits state changes with `{ context, index, oldValue, newValue, oldContext }` payload.',
    contextChanged:
      'Observable stream that emits when a watched context branch is rebound from one object reference to another.',
    startChangeCycle:
      'Observable stream emitted at the beginning of a change cycle, before queued changes are flushed.',
    endChangeCycle:
      'Observable stream emitted at the end of a change cycle, after processing and cleanup.',
    watchState:
      'Registers a watch for `(context, index)` (optionally with owner and index-watch-rule) and returns the current value snapshot.',
    subscribeStateEvents:
      'Registers a keyed callback listener for `(context, index)` and returns an unsubscribe function. This is the low-overhead path used by expression runtime internals.',
    releaseState:
      'Releases one watch reference for `(context, index)` and unsubscribes observers when reference count reaches zero.',
    isWatched:
      'Checks whether `(context, index, indexWatchRule)` is currently registered in the watcher graph.',
    clear:
      'Clears all watched state, subscriptions, and observer/proxy manager resources.',
    getState:
      'Returns the currently stored state value for `(context, index)` from the object-state manager.',
    setState:
      'Sets state for `(context, index)`, triggers rebinding if needed, and emits a semantic change when value differs.',
    toString:
      'Returns a string snapshot of the internal state store for diagnostics/debugging.',
  },
  StateManager: {
    changed:
      'Observable stream of semantic state changes produced by StateManager after equality checks.',
    contextChanged:
      'Observable stream emitted when a watched branch is rebound from old context to new context.',
    startChangeCycle:
      'Lifecycle stream emitted when StateManager starts processing an incoming observer change cycle.',
    endChangeCycle:
      'Lifecycle stream emitted after StateManager finishes a change cycle.',
    watchState:
      'Registers (or reuses) a watch for `(context, index)` and returns current state value.',
    subscribeStateEvents:
      'Adds a direct keyed listener for `(context, index)` that receives state and context-rebind events without requiring global observable fan-out.',
    releaseState:
      'Releases watch references and unregisters observer subscriptions when no references remain.',
    clear:
      'Disposes subscriptions and state store entries managed by this StateManager instance.',
    getState:
      'Reads stored state value for `(context, index)` from the object-state manager.',
    setState:
      'Writes state for `(context, index)`, applies rebinding logic, and emits change if value meaningfully changed.',
    isWatched:
      'Returns true when the requested state key is currently tracked in the subscription graph.',
    toString:
      'Delegates to object-state-manager string output for diagnostics.',
  },
};

const SYMBOL_DOCS: Record<string, SymbolDocumentation> = {
  StateManager: {
    summary:
      'The StateManager is a core service in the RS-X framework that connects the model with expressions. Expressions register leaf identifiers with the StateManager so they can be observed for changes.',
    notes:
      'Normally, you do not need to use the StateManager directly. The only scenario where it is required is when working with `read-only properties`.',
    exampleCode: dedent`
      import { InjectionContainer } from '@rs-x/core';
      import {
        RsXStateManagerModule,
        RsXStateManagerInjectionTokens,
        type IStateManager,
      } from '@rs-x/state-manager';

      await InjectionContainer.load(RsXStateManagerModule);

      const stateManager = InjectionContainer.get<IStateManager>(
        RsXStateManagerInjectionTokens.IStateManager,
      );

      const model = { cart: [{ id: 'A', qty: 1 }] };
      const ownerId = 'docs-demo-owner';

      // Start watching model.cart
      const current = stateManager.watchState(model, 'cart', { ownerId });
      console.log(current); // [{ id: 'A', qty: 1 }]

      // Update through state-manager API
      stateManager.setState(model, 'cart', [{ id: 'A', qty: 2 }], ownerId);

      // When done, always release
      stateManager.releaseState(model, 'cart');
    `,
  },
  IStateManager: {
    summary:
      'Main state-manager contract used by expression runtime services to watch, read, write, release, and observe state changes.',
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



const StateManagerApiSymbolPage: React.FC<StateManagerSymbolPageProps> = async ({params}) => {
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
  const memberDocs = parseDeclarationMembers(apiSignature, entry.symbol,MEMBER_DESCRIPTION_OVERRIDES);

 
  return (
     <DocsApiPageTemplate
          entry={entry}
          memberDocs={memberDocs}
          symbolDocs={SYMBOL_DOCS}
          related={[]}
          moduleDetail={moduleDetail}
          packageName='@rs-x/state-manager'
          fullTypeSignature={fullTypeSignature}
          defaultExample={defaultExample}
          defaultConstructorInjectionExample={() => ''}
          gitBasePath={STATE_MANAGER_GITHUB_BASE }
    
        />
   
  );
}

export default StateManagerApiSymbolPage;