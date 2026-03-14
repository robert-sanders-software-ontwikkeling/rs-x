import dedent from 'dedent';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ItemLinkCardContent } from '@rs-x/react-components';

import { DocsBreadcrumbs } from '../../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../../../components/SyntaxCodeBlock';
import { coreApiItems } from '../../core-api.data';

import { TokenReferenceTable } from './token-reference-table.client';

function slugify(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

function formatModuleLabel(moduleName: string): string {
  return moduleName.replace(/\.ts$/i, '').replace(/\./g, '-');
}

const groupedByModule = coreApiItems.reduce<
  Record<string, typeof coreApiItems>
>((acc, item) => {
  if (!acc[item.module]) {
    acc[item.module] = [];
  }
  acc[item.module].push(item);
  return acc;
}, {});

const moduleEntries = Object.keys(groupedByModule)
  .sort((a, b) => a.localeCompare(b))
  .map((moduleName) => ({
    moduleName,
    slug: slugify(moduleName),
    items: [...groupedByModule[moduleName]].sort((a, b) =>
      a.symbol.localeCompare(b.symbol),
    ),
  }));

const moduleBySlug = new Map(moduleEntries.map((entry) => [entry.slug, entry]));
const apiDescriptionBySymbol = new Map(
  coreApiItems.map((item) => [item.symbol, item.description] as const),
);

type TokenReferenceRow = {
  token: string;
  symbol?: string;
  description?: string;
};

const injectionTokenReferenceRows: TokenReferenceRow[] = [
  { token: 'IInjectionContainer', symbol: 'InjectionContainer' },
  { token: 'IErrorLog', symbol: 'IErrorLog' },
  { token: 'IGlobalIndexAccessor', symbol: 'IGlobalIndexAccessor' },
  { token: 'IIndexValueAccessor', symbol: 'IIndexValueAccessor' },
  { token: 'IMapKeyAccessor', symbol: 'IMapKeyAccessor' },
  { token: 'ISetKeyAccessor', symbol: 'ISetKeyAccessor' },
  { token: 'IArrayIndexAccessor', symbol: 'IArrayIndexAccessor' },
  { token: 'IPropertyValueAccessor', symbol: 'IPropertyValueAccessor' },
  { token: 'IMethodAccessor', symbol: 'IMethodAccessor' },
  { token: 'IDatePropertyAccessor', symbol: 'IDatePropertyAccessor' },
  { token: 'IDeepClone', symbol: 'IDeepClone' },
  { token: 'IEqualityService', symbol: 'IEqualityService' },
  { token: 'IObservableAccessor', symbol: 'IObservableAccessor' },
  { token: 'IPromiseAccessor', symbol: 'IPromiseAccessor' },
  {
    token: 'IIndexValueAccessorList',
    symbol: 'defaultIndexValueAccessorList',
  },
  { token: 'ISequenceIdFactory', symbol: 'ISequenceIdFactory' },
  { token: 'IFunctionCallIndexFactory', symbol: 'IFunctionCallIndexFactory' },
  { token: 'IFunctionCallResultCache', symbol: 'IFunctionCallResultCache' },
  { token: 'IGuidFactory', symbol: 'IGuidFactory' },
  { token: 'IStructuredDeepClone', symbol: 'StructuredDeepClone' },
  { token: 'ILodashDeepClone', symbol: 'LodashDeepClone' },
  {
    token: 'IDeepCloneList',
    symbol: 'defaultDeepCloneList',
  },
  { token: 'IResolvedValueCache', symbol: 'IResolvedValueCache' },
  { token: 'IDeepCloneExcept', symbol: 'IDeepCloneExcept' },
  { token: 'DefaultDeepCloneExcept', symbol: 'DeepCloneValueExcept' },
  {
    token: 'IValueMetadataList',
    symbol: 'defaultValueMetadataList',
  },
  { token: 'ArrayMetadata', symbol: 'ArrayMetadata' },
  { token: 'DateMetadata', symbol: 'DateMetadata' },
  { token: 'DummyMetadata', symbol: 'DummyMetadata' },
  { token: 'MapMetadata', symbol: 'MapMetadata' },
  { token: 'ObservableMetadata', symbol: 'ObservableMetadata' },
  { token: 'PromiseMetadata', symbol: 'PromiseMetadata' },
  { token: 'SetMetadata', symbol: 'SetMetadata' },
  { token: 'IValueMetadata', symbol: 'IValueMetadata' },
  {
    token: 'IDBFactory',
    description:
      'Browser IndexedDB factory used to open IndexedDB databases (resolved from window.indexedDB in browser runtime).',
  },
  { token: 'IObjectStorage', symbol: 'IObjectStorage' },
  { token: 'IProxyRegistry', symbol: 'IProxyRegistry' },
];

export async function generateStaticParams() {
  return moduleEntries.map((entry) => ({ module: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const entry = moduleBySlug.get(module);
  if (!entry) {
    return { title: '@rs-x/core API' };
  }
  return {
    title: `@rs-x/core: ${formatModuleLabel(entry.moduleName)}`,
    description: `API items in ${formatModuleLabel(entry.moduleName)}.`,
  };
}

export default async function CoreApiModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const entry = moduleBySlug.get(module);
  if (!entry) {
    notFound();
  }
  const hasMultipleEntries = entry.items.length > 1;
  const tokenReferenceRows = [...injectionTokenReferenceRows]
    .sort((a, b) => a.token.localeCompare(b.token))
    .map((row) => ({
      token: row.token,
      symbol: row.symbol,
      responsibility: row.symbol
        ? (apiDescriptionBySymbol.get(row.symbol) ?? '-')
        : (row.description ?? '-'),
    }));

  const deepCloneExtensionCode = dedent`
    import {
      InjectionContainer,
      overrideMultiInjectServices,
      RsXCoreInjectionTokens,
      type IMultiInjectService,
      RsXCoreModule,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    const customDeepCloneList: IMultiInjectService[] = [
      // your custom strategy first
      { target: MyDomainDeepClone, token: Symbol('MyDomainDeepClone') },
      // keep default fallbacks
      { target: StructuredDeepClone, token: RsXCoreInjectionTokens.IStructuredDeepClone },
      { target: LodashDeepClone, token: RsXCoreInjectionTokens.ILodashDeepClone },
    ];

    overrideMultiInjectServices(
      InjectionContainer,
      RsXCoreInjectionTokens.IDeepCloneList,
      customDeepCloneList,
    );
  `;
  const deepCloneUsageCode = dedent`
    import {
      InjectionContainer,
      type IDeepClone,
      RsXCoreInjectionTokens,
      RsXCoreModule,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    const deepClone = InjectionContainer.get(
      RsXCoreInjectionTokens.IDeepClone,
    ) as IDeepClone;

    const source = {
      user: { id: 1, name: 'Ada' },
      tags: ['core', 'docs'],
    };

    const cloned = deepClone.clone(source) as typeof source;

    console.log(cloned.user.name); // Ada
    console.log(cloned === source); // false
  `;
  const diUsageCode = dedent`
    import {
      ContainerModule,
      Inject,
      Injectable,
      InjectionContainer,
      registerMultiInjectServices,
      RsXCoreInjectionTokens,
      type IIndexValueAccessor,
    } from '@rs-x/core';

    @Injectable()
    class MyAccessor implements IIndexValueAccessor {
      public priority = 999;
      public getValue(context: unknown, index: unknown): unknown {
        return (context as Record<string, unknown>)[String(index)];
      }
    }

    const module = new ContainerModule((options) => {
      registerMultiInjectServices(options, RsXCoreInjectionTokens.IIndexValueAccessorList, [
        { target: MyAccessor, token: Symbol('MyAccessor') },
      ]);
    });

    await InjectionContainer.load(module);
  `;
  const injectionTokensUsageCode = dedent`
    import {
      Inject,
      InjectionContainer,
      RsXCoreInjectionTokens,
      RsXCoreModule,
      type IEqualityService,
      type IErrorLog,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    // Resolve by token key from the token object.
    const equality = InjectionContainer.get<IEqualityService>(
      RsXCoreInjectionTokens.IEqualityService,
    );
    const errorLog = InjectionContainer.get<IErrorLog>(
      RsXCoreInjectionTokens.IErrorLog,
    );

    class Consumer {
      constructor(
        @Inject(RsXCoreInjectionTokens.IEqualityService)
        private readonly equalityService: IEqualityService,
        @Inject(RsXCoreInjectionTokens.IErrorLog)
        private readonly logger: IErrorLog,
      ) {}
    }

    console.log(equality, errorLog, Consumer);
  `;
  const equalityUsageCode = dedent`
    import {
      InjectionContainer,
      RsXCoreInjectionTokens,
      RsXCoreModule,
      type IEqualityService,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    const equality = InjectionContainer.get<IEqualityService>(
      RsXCoreInjectionTokens.IEqualityService,
    );

    const left = { id: 1, nested: { name: 'Ada' } };
    const right = { id: 1, nested: { name: 'Ada' } };

    console.log(equality.isEqual(left, right)); // true
  `;
  const equalityOverrideCode = dedent`
    import { createCustomEqual } from 'fast-equals';
    import {
      ContainerModule,
      InjectionContainer,
      Injectable,
      RsXCoreInjectionTokens,
      type IEqualityService,
    } from '@rs-x/core';

    @Injectable()
    class StrictReferenceEqualityService implements IEqualityService {
      public isEqual = createCustomEqual({
        createCustomConfig: (base) => ({
          ...base,
          areObjectsEqual: (a, b) => a === b,
        }),
      });
    }

    const module = new ContainerModule((options) => {
      if (options.isBound(RsXCoreInjectionTokens.IEqualityService)) {
        options.unbind(RsXCoreInjectionTokens.IEqualityService);
      }

      options
        .bind<IEqualityService>(RsXCoreInjectionTokens.IEqualityService)
        .to(StrictReferenceEqualityService)
        .inSingletonScope();
    });

    await InjectionContainer.load(module);
  `;
  const errorLogUsageCode = dedent`
    import {
      InjectionContainer,
      RsXCoreInjectionTokens,
      RsXCoreModule,
      type IErrorLog,
      type IError,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    const errorLog = InjectionContainer.get<IErrorLog>(
      RsXCoreInjectionTokens.IErrorLog,
    );

    const subscription = errorLog.error.subscribe((entry: IError) => {
      console.log('logged error:', entry.message);
    });

    errorLog.add({
      message: 'Something failed',
      context: 'Expression evaluation',
      fatal: false,
    });

    // clears console output in default implementation
    errorLog.clear();
    subscription.unsubscribe();
  `;
  const errorLogOverrideCode = dedent`
    import {
      ContainerModule,
      Injectable,
      InjectionContainer,
      RsXCoreInjectionTokens,
      type IError,
      type IErrorLog,
    } from '@rs-x/core';
    import { Subject } from 'rxjs';

    @Injectable()
    class MemoryErrorLog implements IErrorLog {
      private readonly stream = new Subject<IError>();
      public readonly error = this.stream.asObservable();
      private readonly history: IError[] = [];

      public add(error: IError): void {
        this.history.push(error);
        this.stream.next(error);
      }

      public clear(): void {
        this.history.length = 0;
      }
    }

    const module = new ContainerModule((options) => {
      if (options.isBound(RsXCoreInjectionTokens.IErrorLog)) {
        options.unbind(RsXCoreInjectionTokens.IErrorLog);
      }

      options
        .bind<IErrorLog>(RsXCoreInjectionTokens.IErrorLog)
        .to(MemoryErrorLog)
        .inSingletonScope();
    });

    await InjectionContainer.load(module);
  `;
  const objectStoreUsageCode = dedent`
    import {
      InjectionContainer,
      RsXCoreInjectionTokens,
      RsXCoreModule,
      type IObjectStorage,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    const objectStorage = InjectionContainer.get<IObjectStorage>(
      RsXCoreInjectionTokens.IObjectStorage,
    );

    await objectStorage.set('user:1', { id: 1, name: 'Ada' });
    const user = await objectStorage.get<{ id: number; name: string }>('user:1');

    console.log(user?.name); // Ada
    objectStorage.close();
  `;
  const objectStoreOverrideCode = dedent`
    import {
      ContainerModule,
      Injectable,
      InjectionContainer,
      RsXCoreInjectionTokens,
      type IObjectStorage,
    } from '@rs-x/core';

    @Injectable()
    class MemoryObjectStorage implements IObjectStorage {
      private readonly map = new Map<string, unknown>();

      public async get<T>(key: string): Promise<T> {
        return this.map.get(key) as T;
      }

      public async set<T>(key: string, value: T): Promise<void> {
        this.map.set(key, value);
      }

      public close(): void {
        this.map.clear();
      }
    }

    const module = new ContainerModule((options) => {
      if (options.isBound(RsXCoreInjectionTokens.IObjectStorage)) {
        options.unbind(RsXCoreInjectionTokens.IObjectStorage);
      }

      options
        .bind<IObjectStorage>(RsXCoreInjectionTokens.IObjectStorage)
        .to(MemoryObjectStorage)
        .inSingletonScope();
    });

    await InjectionContainer.load(module);
  `;
  const proxyRegistryUsageCode = dedent`
    import {
      InjectionContainer,
      RsXCoreInjectionTokens,
      RsXCoreModule,
      type IProxyRegistry,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    const proxyRegistry = InjectionContainer.get<IProxyRegistry>(
      RsXCoreInjectionTokens.IProxyRegistry,
    );

    const target = { id: 1 };
    const proxy = new Proxy(target, {});

    proxyRegistry.register(target, proxy);

    const resolvedProxy = proxyRegistry.getProxy(target);
    const resolvedTarget = proxyRegistry.getProxyTarget(proxy);

    console.log(resolvedProxy === proxy); // true
    console.log(resolvedTarget === target); // true
    console.log(proxyRegistry.isProxy(proxy)); // true
  `;
  const indexValueAccessorUsageCode = dedent`
    import {
      InjectionContainer,
      RsXCoreInjectionTokens,
      RsXCoreModule,
      type IIndexValueAccessor,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    const accessor = InjectionContainer.get<IIndexValueAccessor>(
      RsXCoreInjectionTokens.IIndexValueAccessor,
    );

    const model = {
      user: { name: 'Ada' },
      list: [10, 20, 30],
      map: new Map([['x', 99]]),
    };

    const name = accessor.getValue(model.user, 'name');
    const second = accessor.getValue(model.list, 1);
    const mapped = accessor.getValue(model.map, 'x');

    console.log(name, second, mapped); // Ada 20 99
  `;
  const indexValueAccessorCustomizationCode = dedent`
    import {
      ArrayIndexAccessor,
      ContainerModule,
      InjectionContainer,
      overrideMultiInjectServices,
      PropertyValueAccessor,
      RsXCoreInjectionTokens,
      RsXCoreModule,
      type IMultiInjectService,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    const customAccessorList: IMultiInjectService[] = [
      { target: PropertyValueAccessor, token: RsXCoreInjectionTokens.IPropertyValueAccessor },
      { target: ArrayIndexAccessor, token: RsXCoreInjectionTokens.IArrayIndexAccessor },
      // add your custom accessor(s) here
    ];

    const module = new ContainerModule((options) => {
      overrideMultiInjectServices(
        options,
        RsXCoreInjectionTokens.IIndexValueAccessorList,
        customAccessorList,
      );
    });

    await InjectionContainer.load(module);
  `;
  const sequenceIdUsageCode = dedent`
    import {
      InjectionContainer,
      RsXCoreInjectionTokens,
      RsXCoreModule,
      type ISequenceIdFactory,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    const sequenceIdFactory = InjectionContainer.get<ISequenceIdFactory>(
      RsXCoreInjectionTokens.ISequenceIdFactory,
    );

    const context = {};
    const sequence = ['user', 'profile', 'name'];

    const handle = sequenceIdFactory.create(context, sequence);
    console.log(handle.id);

    const sameHandle = sequenceIdFactory.get(context, sequence);
    console.log(sameHandle?.id === handle.id); // true

    // Always release/dispose when finished to avoid retained references.
    handle.dispose();
    // equivalent:
    // sequenceIdFactory.release(context, handle.id);
  `;
  const sequenceIdInjectionCode = dedent`
    import {
      Inject,
      RsXCoreInjectionTokens,
      type ISequenceIdFactory,
    } from '@rs-x/core';

    class SequenceConsumer {
      constructor(
        @Inject(RsXCoreInjectionTokens.ISequenceIdFactory)
        private readonly sequenceIdFactory: ISequenceIdFactory,
      ) {}

      track(context: object, path: unknown[]): string {
        const handle = this.sequenceIdFactory.create(context, path);
        try {
          return handle.id;
        } finally {
          handle.dispose();
        }
      }
    }
  `;
  const singletonFactoryUsageCode = dedent`
    import { KeyedInstanceFactory } from '@rs-x/core';

    type UserData = { id: string; name: string };

    class MyKeyedInstanceFactory extends KeyedInstanceFactory<string, UserData, UserData, UserData> {
      public getId(data: UserData): string | undefined {
        return data.id;
      }

      protected createId(data: UserData): string {
        return data.id;
      }

      protected createInstance(data: UserData): UserData {
        return { ...data };
      }
    }

    const factory = new MyKeyedInstanceFactory();

    // create(...) increases reference count
    const first = factory.create({ id: 'u1', name: 'Ada' });
    console.log(first.referenceCount); // 1

    // same id => same instance reused
    const second = factory.create({ id: 'u1', name: 'Ada' });
    console.log(second.referenceCount); // 2

    // Always release to avoid memory leaks
    factory.release('u1');
    factory.release('u1');
  `;
  const waitForEventUsageCode = dedent`
    import { Subject } from 'rxjs';
    import { WaitForEvent } from '@rs-x/core';

    const target = {
      message$: new Subject<string>(),
    };

    const waiter = new WaitForEvent(target, 'message$', {
      count: 2,
      timeout: 1000,
      ignoreInitialValue: false,
    });

    const result = await waiter.wait(() => {
      target.message$.next('first');
      target.message$.next('second');
    });

    console.log(result); // ['first', 'second']
  `;
  const valueMetadataUsageCode = dedent`
    import {
      InjectionContainer,
      RsXCoreInjectionTokens,
      RsXCoreModule,
      type IValueMetadata,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    const valueMetadata = InjectionContainer.get<IValueMetadata>(
      RsXCoreInjectionTokens.IValueMetadata,
    );

    console.log(valueMetadata.isAsync(Promise.resolve(1))); // true
    console.log(valueMetadata.needsProxy(new Map())); // true
    console.log(valueMetadata.needsProxy(42)); // false (DummyMetadata fallback)
  `;
  const valueMetadataCustomizationCode = dedent`
    import {
      ArrayMetadata,
      DateMetadata,
      DummyMetadata,
      InjectionContainer,
      MapMetadata,
      ObservableMetadata,
      overrideMultiInjectServices,
      PromiseMetadata,
      RsXCoreInjectionTokens,
      RsXCoreModule,
      SetMetadata,
      type IMultiInjectService,
      type IValueMetadata,
    } from '@rs-x/core';

    class UrlMetadata implements IValueMetadata {
      public readonly priority = 9;
      public isAsync(): boolean { return false; }
      public needsProxy(): boolean { return false; }
      public applies(value: unknown): boolean { return value instanceof URL; }
    }

    await InjectionContainer.load(RsXCoreModule);

    const customMetadataList: IMultiInjectService[] = [
      { target: UrlMetadata, token: Symbol('UrlMetadata') },
      // keep default handlers after your custom one
      { target: ArrayMetadata, token: RsXCoreInjectionTokens.ArrayMetadata },
      { target: DateMetadata, token: RsXCoreInjectionTokens.DateMetadata },
      { target: DummyMetadata, token: RsXCoreInjectionTokens.DummyMetadata },
      { target: MapMetadata, token: RsXCoreInjectionTokens.MapMetadata },
      { target: ObservableMetadata, token: RsXCoreInjectionTokens.ObservableMetadata },
      { target: PromiseMetadata, token: RsXCoreInjectionTokens.PromiseMetadata },
      { target: SetMetadata, token: RsXCoreInjectionTokens.SetMetadata },
    ];

    overrideMultiInjectServices(
      InjectionContainer,
      RsXCoreInjectionTokens.IValueMetadataList,
      customMetadataList,
    );
  `;

  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: '@rs-x/core API', href: '/docs/core-api' },
              { label: formatModuleLabel(entry.moduleName) },
            ]}
          />
          <p className="docsApiEyebrow">API Reference</p>
          <h1 className="sectionTitle">
            {formatModuleLabel(entry.moduleName)}
          </h1>
          {hasMultipleEntries && (
            <p className="sectionLead">
              API entries in this module:{' '}
              <span className="codeInline">{entry.items.length}</span>
            </p>
          )}
        </div>
      </div>

      <article className="card docsApiCard coreModuleCard">
        {entry.moduleName === 'deep-clone' && (
          <>
            <h2 className="cardTitle">Current deep-clone implementation</h2>
            <p className="cardText">
              <span className="codeInline">IDeepClone</span> resolves to{' '}
              <span className="codeInline">DefaultDeepClone</span>. It receives{' '}
              <span className="codeInline">IDeepCloneList</span> via
              multi-inject and tries each clone implementation in injected order
              until one succeeds.
            </p>
            <p className="cardText">
              In the default module configuration, list order is:
              <span className="codeInline"> StructuredDeepClone</span> then
              <span className="codeInline"> LodashDeepClone</span>. If one
              strategy throws, the next strategy is attempted.
            </p>
            <p className="cardText">
              <span className="codeInline">LodashDeepClone</span> unwraps
              proxy-wrapped values to their original targets using{' '}
              <Link href="/docs/iproxy-registry">IProxyRegistry</Link>. During
              clone traversal it also calls{' '}
              <span className="codeInline">IDeepCloneExcept</span> (default:
              <span className="codeInline"> DefaultDeepCloneExcept</span>) to
              substitute special values, such as Promise/Observable with their
              last resolved/emitted value.
            </p>
            <h3 className="coreInlineCodeTitle">
              Example: use IDeepClone service
            </h3>
            <SyntaxCodeBlock code={deepCloneUsageCode} />

            <h2 className="cardTitle">How to extend or modify</h2>
            <p className="cardText">
              Register your own <span className="codeInline">IDeepClone</span>{' '}
              implementation and override{' '}
              <span className="codeInline">IDeepCloneList</span> order. Earlier
              entries run first, so put domain-specific strategies before
              generic fallbacks.
            </p>

            <h3 className="coreInlineCodeTitle">
              Override deep-clone strategy order
            </h3>
            <SyntaxCodeBlock code={deepCloneExtensionCode} />
          </>
        )}

        {entry.moduleName === 'dependency-injection.ts' && (
          <>
            <h2 className="cardTitle">
              Current dependency-injection implementation
            </h2>
            <p className="cardText">
              This module wraps and re-exports the DI runtime used by rs-x. It
              is based on{' '}
              <a href="https://inversify.io/" target="_blank" rel="noreferrer">
                Inversify
              </a>{' '}
              and exposes rs-x-friendly helpers such as{' '}
              <span className="codeInline">InjectionContainer</span>,{' '}
              <span className="codeInline">ContainerModule</span>, decorator
              aliases (<span className="codeInline">Injectable</span>,{' '}
              <span className="codeInline">Inject</span>,{' '}
              <span className="codeInline">MultiInject</span>), and multi-bind
              helper functions.
            </p>
            <p className="cardText">
              The global <span className="codeInline">InjectionContainer</span>{' '}
              is a shared singleton container used across core, state-manager,
              and expression-parser modules.
            </p>

            <h2 className="cardTitle">How to extend or modify</h2>
            <p className="cardText">
              Use <span className="codeInline">ContainerModule</span> plus{' '}
              <span className="codeInline">registerMultiInjectServices</span> or{' '}
              <span className="codeInline">overrideMultiInjectServices</span> to
              add or replace implementations for a multi-inject token list.
            </p>
            <h3 className="coreInlineCodeTitle">
              Example: register custom DI module
            </h3>
            <SyntaxCodeBlock code={diUsageCode} />
          </>
        )}

        {entry.moduleName === 'rs-x-core.injection-tokens.ts' && (
          <>
            <h2 className="cardTitle">
              Current rs-x-core.injection-tokens implementation
            </h2>
            <p className="cardText">
              <span className="codeInline">RsXCoreInjectionTokens</span>{' '}
              contains token keys for core services.
            </p>
            <p className="cardText">
              Tokens such as{' '}
              <span className="codeInline">IEqualityService</span>,{' '}
              <span className="codeInline">IErrorLog</span>,{' '}
              <span className="codeInline">IDeepClone</span> let you resolve a
              service from the container or inject it into a constructor.
            </p>
            <p className="cardText">
              Use{' '}
              <span className="codeInline">InjectionContainer.get(token)</span>{' '}
              to resolve a service, or{' '}
              <span className="codeInline">@Inject(token)</span> to inject it
              into a class constructor.
            </p>
            <h3 className="coreInlineCodeTitle">
              Example: resolve and inject by token keys
            </h3>
            <SyntaxCodeBlock code={injectionTokensUsageCode} />

            <h2 className="cardTitle">Token reference</h2>
            <p className="cardText">
              The table below maps each token key to the service it refers to
              and describes that service&apos;s responsibility.
            </p>
            <TokenReferenceTable rows={tokenReferenceRows} />
          </>
        )}

        {entry.moduleName === 'equality-service' && (
          <>
            <h2 className="cardTitle">
              Current equality-service implementation
            </h2>
            <p className="cardText">
              <span className="codeInline">IEqualityService</span> resolves to{' '}
              <span className="codeInline">EqualityService</span> in{' '}
              <span className="codeInline">RsXCoreModule</span> singleton scope.
              Consumers should resolve the service via{' '}
              <span className="codeInline">
                RsXCoreInjectionTokens.IEqualityService
              </span>{' '}
              instead of instantiating the class directly.
            </p>
            <p className="cardText">
              The default implementation uses{' '}
              <a
                className="codeInline"
                href="https://www.npmjs.com/package/fast-equals"
                target="_blank"
                rel="noreferrer"
              >
                fast-equals
              </a>{' '}
              with custom object handling. For most objects it performs deep
              equality. For RxJS Observables, it compares by reference (
              <span className="codeInline">a === b</span>) to avoid treating
              separate stream instances as equal by structure.
            </p>
            <p className="cardText">
              This service is used by runtime change-detection decisions where
              rs-x needs to know whether a value is materially changed before
              propagating updates.
            </p>
            <h3 className="coreInlineCodeTitle">
              Example: use IEqualityService
            </h3>
            <SyntaxCodeBlock code={equalityUsageCode} />

            <h2 className="cardTitle">How to extend or modify</h2>
            <p className="cardText">
              Provide your own{' '}
              <span className="codeInline">IEqualityService</span>{' '}
              implementation and rebind{' '}
              <span className="codeInline">
                RsXCoreInjectionTokens.IEqualityService
              </span>{' '}
              to your custom class. Keep singleton scope so all runtime
              components share the same equality behavior.
            </p>
            <h3 className="coreInlineCodeTitle">Override equality service</h3>
            <SyntaxCodeBlock code={equalityOverrideCode} />
          </>
        )}

        {entry.moduleName === 'error-log' && (
          <>
            <h2 className="cardTitle">Current error-log implementation</h2>
            <p className="cardText">
              In the default setup,{' '}
              <span className="codeInline">IErrorLog</span> uses the{' '}
              <span className="codeInline">ErrorLog</span> class as a shared
              singleton service.
            </p>
            <p className="cardText">
              <span className="codeInline">add(error)</span> logs the error to
              the console and also emits it through the observable{' '}
              <span className="codeInline">error</span> stream.{' '}
              <span className="codeInline">clear()</span> clears the console.
            </p>
            <p className="cardText">
              The module also includes{' '}
              <span className="codeInline">PrettyPrinter</span> and{' '}
              <span className="codeInline">printValue</span> to format complex
              values for debugging output.
            </p>
            <h3 className="coreInlineCodeTitle">
              Example: use IErrorLog service
            </h3>
            <SyntaxCodeBlock code={errorLogUsageCode} />

            <h2 className="cardTitle">How to extend or modify</h2>
            <p className="cardText">
              Create your own <span className="codeInline">IErrorLog</span>{' '}
              implementation (for example memory/remote logging) and rebind{' '}
              <span className="codeInline">
                RsXCoreInjectionTokens.IErrorLog
              </span>{' '}
              to that class in singleton scope.
            </p>
            <h3 className="coreInlineCodeTitle">Override error-log service</h3>
            <SyntaxCodeBlock code={errorLogOverrideCode} />
          </>
        )}

        {entry.moduleName === 'exceptions' && (
          <>
            <h2 className="cardTitle">Current exceptions implementation</h2>
            <p className="cardText">
              This module contains typed error classes used across rs-x core.
              Most exceptions extend{' '}
              <span className="codeInline">CustomError</span> so error names
              remain stable and easier to handle in logs/tests.
            </p>
            <p className="cardText">
              It also includes the static{' '}
              <span className="codeInline">Assertion</span> helper for common
              guard checks (predicate, function type, null/empty). These guards
              throw specific exception types so failures are explicit.
            </p>
          </>
        )}

        {entry.moduleName === 'function-call-index' && (
          <>
            <h2 className="cardTitle">
              Current function-call-index implementation
            </h2>
            <p className="cardText">
              This module builds the same identity for each repeated function
              call using
              <span className="codeInline"> context</span>,{' '}
              <span className="codeInline">functionName</span>, and an arguments
              id. rs-x uses this id to recognize "this is the same call as
              before" and to find the correct cached call result.
            </p>
            <p className="cardText">
              <Link href="/docs/core-api/FunctionCallIndexFactory">
                <span className="codeInline">FunctionCallIndexFactory</span>
              </Link>{' '}
              builds or returns the same call-id object for the same call input
              (same context, function name, and arguments).
            </p>
          </>
        )}

        {entry.moduleName === 'function-call-result-cache' && (
          <>
            <h2 className="cardTitle">
              Current function-call-result-cache implementation
            </h2>
            <p className="cardText">
              This module provides utilities to cache function-call results, so
              repeated evaluation can reuse previous results instead of
              recomputing every call.
            </p>
            <p className="cardText">
              Cache entries are grouped by context object and keyed by
              function-call identity (function name + arguments, represented by
              function-call index). The service supports create, has, and get
              operations to manage and read cached entries.
            </p>
          </>
        )}

        {entry.moduleName === 'sequence-id' && (
          <>
            <h2 className="cardTitle">Current sequence-id implementation</h2>
            <p className="cardText">
              This module returns the same id for matching sequence payloads in
              a specific context object. When the same context and sequence are
              used again, rs-x reuses the same sequence-id handle.
            </p>
            <p className="cardText">
              <span className="codeInline">create(context, sequence)</span>{' '}
              creates or reuses a handle.{' '}
              <span className="codeInline">get(context, sequence)</span> only
              reads an existing handle.{' '}
              <span className="codeInline">release(context, id)</span> releases
              one reference for that handle.
            </p>
            <p className="cardText">
              The default singleton service is{' '}
              <span className="codeInline">SequenceIdFactory</span>, resolved
              through{' '}
              <span className="codeInline">
                RsXCoreInjectionTokens.ISequenceIdFactory
              </span>
              . If you call <span className="codeInline">create</span>, call{' '}
              <span className="codeInline">dispose()</span> on the returned
              handle (or call <span className="codeInline">release</span>) when
              finished to prevent memory leaks.
            </p>
            <h3 className="coreInlineCodeTitle">
              Example: use ISequenceIdFactory
            </h3>
            <SyntaxCodeBlock code={sequenceIdUsageCode} />
            <h3 className="coreInlineCodeTitle">
              Example: inject into constructor
            </h3>
            <SyntaxCodeBlock code={sequenceIdInjectionCode} />
          </>
        )}

        {entry.moduleName === 'index-value-accessor' && (
          <>
            <h2 className="cardTitle">
              Current index-value-accessor implementation
            </h2>
            <p className="cardText">
              <span className="codeInline">IndexValueAccessor</span> is the
              default <span className="codeInline">IIndexValueAccessor</span>{' '}
              service. It receives all registered accessor strategies from{' '}
              <span className="codeInline">IIndexValueAccessorList</span>, sorts
              them by <span className="codeInline">priority</span> (highest
              first), and delegates each operation to the first strategy whose{' '}
              <span className="codeInline">applies(context, index)</span>{' '}
              returns true.
            </p>
            <p className="cardText">
              In <span className="codeInline">RsXCoreModule</span>, the default
              strategy order is:{' '}
              <span className="codeInline">PropertyValueAccessor (7)</span>,{' '}
              <span className="codeInline">MethodAccessor (6)</span>,{' '}
              <span className="codeInline">ArrayIndexAccessor (5)</span>,{' '}
              <span className="codeInline">MapKeyAccessor (4)</span>,{' '}
              <span className="codeInline">SetKeyAccessor (3)</span>,{' '}
              <span className="codeInline">ObservableAccessor (2)</span>,{' '}
              <span className="codeInline">PromiseAccessor (1)</span>,{' '}
              <span className="codeInline">DatePropertyAccessor (0)</span>,{' '}
              <span className="codeInline">GlobalIndexAccessor (-1)</span>.
            </p>
            <p className="cardText">
              For async wrappers, <span className="codeInline">getValue</span>{' '}
              returns the raw Promise/Observable, while{' '}
              <span className="codeInline">getResolvedValue</span> returns the
              latest cached resolved/emitted value when available, otherwise{' '}
              <span className="codeInline">PENDING</span>. If no accessor can
              handle a context/index pair, the service throws{' '}
              <span className="codeInline">NoAccessorFoundExeception</span>.
            </p>
            <h3 className="coreInlineCodeTitle">
              Example: use IIndexValueAccessor
            </h3>
            <SyntaxCodeBlock code={indexValueAccessorUsageCode} />

            <h2 className="cardTitle">How to extend or modify</h2>
            <p className="cardText">
              To customize behavior, override{' '}
              <span className="codeInline">IIndexValueAccessorList</span> with
              your own ordered strategy list. Put special-case accessors near
              the top and generic catch-all accessors near the bottom, because
              the first matching accessor is the one that gets used.
            </p>
            <h3 className="coreInlineCodeTitle">
              Override accessor strategy list
            </h3>
            <SyntaxCodeBlock code={indexValueAccessorCustomizationCode} />
          </>
        )}

        {entry.moduleName === 'object-store' && (
          <>
            <h2 className="cardTitle">Current object-store implementation</h2>
            <p className="cardText">
              <span className="codeInline">IObjectStorage</span> resolves to{' '}
              <span className="codeInline">ObjectStorage</span> in singleton
              scope. The default implementation uses IndexedDB with one database
              (
              <span className="codeInline">
                objectStore_6a46e952c07d42629cd8fca03b21ce30
              </span>
              ) and one object store (
              <span className="codeInline">objects</span>).
            </p>
            <p className="cardText">
              <span className="codeInline">set(key, value)</span> performs a
              read-write transaction and stores/replaces the value by key.{' '}
              <span className="codeInline">get(key)</span> performs a read-only
              transaction and returns the stored value (or{' '}
              <span className="codeInline">undefined</span> when the key does
              not exist).
            </p>
            <p className="cardText">
              <span className="codeInline">close()</span> closes the cached
              database connection. The next call to{' '}
              <span className="codeInline">get</span> or{' '}
              <span className="codeInline">set</span> reopens it automatically.
              Because it depends on{' '}
              <span className="codeInline">IDBFactory</span>, this service is
              browser-only and not available during SSR.
            </p>
            <p className="cardText">
              IndexedDB stores values with the structured-clone algorithm, so
              stored values must be structured-clone compatible. For example,
              functions, DOM nodes, and class instances with non-cloneable state
              cannot be persisted directly.
            </p>
            <h3 className="coreInlineCodeTitle">Example: use IObjectStorage</h3>
            <SyntaxCodeBlock code={objectStoreUsageCode} />

            <h2 className="cardTitle">How to extend or modify</h2>
            <p className="cardText">
              Rebind <span className="codeInline">IObjectStorage</span> to
              replace IndexedDB storage (for example memory storage in tests,
              remote storage, or encrypted persistence), while keeping the same
              async API contract.
            </p>
            <h3 className="coreInlineCodeTitle">
              Override object storage service
            </h3>
            <SyntaxCodeBlock code={objectStoreOverrideCode} />
          </>
        )}

        {entry.moduleName === 'proxy-registry' && (
          <>
            <h2 className="cardTitle">Current proxy-registry implementation</h2>
            <p className="cardText">
              <span className="codeInline">IProxyRegistry</span> resolves to{' '}
              <span className="codeInline">ProxyRegistry</span> as a shared
              singleton service. It stores target/proxy pairs in memory.
            </p>
            <p className="cardText">
              <span className="codeInline">register(target, proxy)</span> adds
              or replaces a mapping.{' '}
              <span className="codeInline">getProxy(target)</span> returns the
              proxy for a target.
            </p>
            <p className="cardText">
              <span className="codeInline">getProxyTarget(proxy)</span> returns
              the original target for a proxy.{' '}
              <span className="codeInline">isProxy(value)</span> checks whether
              a value is currently registered as a proxy.{' '}
              <span className="codeInline">unregister(target)</span> removes a
              mapping.
            </p>
            <p className="cardText">
              This registry is memory-only (not persisted). Core services use it
              to move between wrapped and unwrapped references consistently (for
              example in deep-clone flows).
            </p>
            <h3 className="coreInlineCodeTitle">Example: use IProxyRegistry</h3>
            <SyntaxCodeBlock code={proxyRegistryUsageCode} />
          </>
        )}

        {entry.moduleName === 'keyed-instance-factory' && (
          <>
            <h2 className="cardTitle">keyed-instance-factory overview</h2>
            <p className="cardText">
              <span className="codeInline">KeyedInstanceFactory</span> is an
              abstract class that lets you manage one singleton instance per
              user-defined id. It keeps a reference count for each id:{' '}
              <span className="codeInline">create(...)</span> increments the
              count by one, and <span className="codeInline">release(...)</span>{' '}
              decrements it by one. When the reference count reaches zero, the
              instance is released.
            </p>
            <h3 className="coreInlineCodeTitle">
              Example: extend KeyedInstanceFactory
            </h3>
            <SyntaxCodeBlock code={singletonFactoryUsageCode} />
          </>
        )}

        {entry.moduleName === 'value-metadata' && (
          <>
            <h2 className="cardTitle">Current value-metadata implementation</h2>
            <p className="cardText">
              The <span className="codeInline">ValueMetadata</span> service
              provides information about how rs-x should handle a value type at
              runtime: whether it should be proxied and whether it is async. It
              receives handlers from{' '}
              <span className="codeInline">IValueMetadataList</span>, sorts them
              by <span className="codeInline">priority</span> (highest first),
              and uses the first handler where{' '}
              <span className="codeInline">applies(value)</span> returns true.
            </p>
            <p className="cardText">
              Default handlers are:{' '}
              <span className="codeInline">ArrayMetadata (8)</span>,{' '}
              <span className="codeInline">DateMetadata (7)</span>,{' '}
              <span className="codeInline">MapMetadata (6)</span>,{' '}
              <span className="codeInline">ObservableMetadata (5)</span>,{' '}
              <span className="codeInline">PromiseMetadata (4)</span>,{' '}
              <span className="codeInline">SetMetadata (3)</span>, and fallback{' '}
              <span className="codeInline">DummyMetadata (-1000)</span>.
            </p>
            <p className="cardText">
              Runtime services use this metadata to decide whether a value is
              async (<span className="codeInline">isAsync</span>) and whether it
              should be proxied (<span className="codeInline">needsProxy</span>
              ).
            </p>
            <h3 className="coreInlineCodeTitle">Example: use IValueMetadata</h3>
            <SyntaxCodeBlock code={valueMetadataUsageCode} />

            <h2 className="cardTitle">How to extend or modify</h2>
            <p className="cardText">
              Add your own metadata class and override{' '}
              <span className="codeInline">IValueMetadataList</span> order so
              your custom type is checked before generic handlers.
            </p>
            <h3 className="coreInlineCodeTitle">
              Override metadata strategy list
            </h3>
            <SyntaxCodeBlock code={valueMetadataCustomizationCode} />
          </>
        )}

        {entry.moduleName === 'wait-for-event' && (
          <>
            <h2 className="cardTitle">Current wait-for-event implementation</h2>
            <p className="cardText">
              <span className="codeInline">WaitForEvent</span> helps you trigger
              an action and then wait for emissions from an Observable event
              property on a target object.
            </p>
            <p className="cardText">
              Configure <span className="codeInline">count</span> to wait for
              one or more emissions, <span className="codeInline">timeout</span>{' '}
              to cap how long it waits, and{' '}
              <span className="codeInline">ignoreInitialValue</span> when the
              first emission should be skipped.
            </p>
            <p className="cardText">
              The <span className="codeInline">wait(trigger)</span> call
              subscribes, runs the trigger (sync/Promise/Observable), collects
              emitted values, and resolves with the value (or values). If
              timeout is reached first, it resolves{' '}
              <span className="codeInline">null</span>.
            </p>
            <h3 className="coreInlineCodeTitle">
              Example: wait for emitted events
            </h3>
            <SyntaxCodeBlock code={waitForEventUsageCode} />
          </>
        )}

        {entry.items.length > 0 && (
          <div className="coreModuleSymbols">
            <h2 className="cardTitle">
              {entry.items.length === 1
                ? 'Module API entry'
                : 'Module API entries'}
            </h2>
            <ul className="docsApiLinkGrid">
              {entry.items.map((item) => (
                <li key={item.symbol}>
                  <Link
                    className="docsApiLinkItem"
                    href={`/docs/core-api/${encodeURIComponent(item.symbol)}`}
                  >
                    <ItemLinkCardContent
                      title={item.symbol}
                      meta={item.kind}
                      description={item.description}
                      descriptionClassName="cardText docsApiLinkDescription"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </DocsPageTemplate>
  );
}
