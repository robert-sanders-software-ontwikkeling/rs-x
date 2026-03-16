import dedent from 'dedent';
import type { Metadata } from 'next';
import Link from 'next/link';

import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../_template/core-concept-page';

const exampleCode = dedent`
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

const doc: CoreConceptDoc = {
  title: 'Dependency injection',
  lead: 'Compose runtime modules and adapt services without changing business expression code.',
  whatItMeans: (
    <>
      RS-X is designed to be adaptable. To accomplish that it uses the
      composition pattern so services can be extended or adapted through
      dependency injection. The current dependency-injection implementation is
      based on{' '}
      <a href="https://inversify.io/" target="_blank" rel="noreferrer">
        Inversify
      </a>{' '}
      and exposed through{' '}
      <Link href="/docs/core-api/InjectionContainer">
        <span className="codeInline">InjectionContainer</span>
      </Link>
      .
    </>
  ),
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
  exampleCode: exampleCode,
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
};

export const metadata: Metadata = {
  title: doc.title,
  description: doc.lead,
};

export default function Page() {
  return <CoreConceptPageLayout doc={doc} />;
}
