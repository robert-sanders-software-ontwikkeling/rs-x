import dedent from 'dedent';
import Link from 'next/link';

import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';

import { CustomDataTypesDownloadButton } from './custom-data-types-download.client';

export const metadata = {
  title: 'Custom data types',
  description:
    'Teach rs-x to observe any object type — custom classes, domain models, or third-party structures — by implementing observer, proxy, and index-accessor contracts.',
};

// ─── code samples ────────────────────────────────────────────────────────────

const textDocumentClassCode = dedent`
  interface ITextDocumentIndex {
    pageIndex: number;
    lineIndex: number;
  }

  class TextDocument {
    private readonly _pages = new Map<number, Map<number, string>>();

    constructor(pages?: string[][]) {
      pages?.forEach((page, pageIndex) => {
        const pageMap = new Map<number, string>();
        this._pages.set(pageIndex, pageMap);
        page.forEach((line, lineIndex) => pageMap.set(lineIndex, line));
      });
    }

    public getLine(index: ITextDocumentIndex): string | undefined {
      return this._pages.get(index.pageIndex)?.get(index.lineIndex);
    }

    public setLine(index: ITextDocumentIndex, text: string): void {
      let page = this._pages.get(index.pageIndex);
      if (!page) {
        page = new Map();
        this._pages.set(index.pageIndex, page);
      }
      page.set(index.lineIndex, text);
    }
  }
`;

const observerCode = dedent`
  import { AbstractObserver } from '@rs-x/state-manager';
  import { type IProxyRegistry } from '@rs-x/core';

  // Wraps a TextDocument in a Proxy.
  // Intercepts setLine() calls to emit IPropertyChange events.
  class TextDocumentObserver extends AbstractObserver<TextDocument> {
    constructor(
      textDocument: TextDocument,
      private readonly _proxyRegister: IProxyRegistry,
      owner?: IDisposableOwner,
    ) {
      super(owner, Type.cast(undefined), textDocument);

      // Create the proxy and register it so rs-x can identify
      // proxied instances throughout the pipeline.
      this.target = new Proxy(textDocument, this);
      this._proxyRegister.register(textDocument, this.target);
    }

    protected override disposeInternal(): void {
      this._proxyRegister.unregister(this.value);
    }

    // Proxy trap: intercept setLine to emit a change event.
    public get(
      textDocument: TextDocument,
      property: PropertyKey,
      receiver: unknown,
    ): unknown {
      if (property === 'setLine') {
        return (index: ITextDocumentIndex, text: string) => {
          textDocument.setLine(index, text);
          this.emitChange({
            arguments: [],
            index,
            target: textDocument,
            newValue: text,
          });
        };
      }
      return Reflect.get(textDocument, property, receiver);
    }
  }
`;

const indexObserverCode = dedent`
  import { AbstractObserver } from '@rs-x/state-manager';
  import { ReplaySubject, Subscription } from 'rxjs';

  // Watches a single cell (pageIndex, lineIndex) inside a TextDocument.
  // Only emits when the matching cell is updated.
  class TextDocumentIndexObserver extends AbstractObserver<
    TextDocument,
    string,
    ITextDocumentIndex
  > {
    private readonly _changeSubscription: Subscription;

    constructor(
      owner: IDisposableOwner,
      private readonly _observer: TextDocumentObserver,
      index: ITextDocumentIndex,
    ) {
      super(
        owner,
        _observer.target,
        _observer.target.getLine(index),
        new ReplaySubject(),
        index,
      );
      this._changeSubscription = _observer.changed.subscribe(this.onChange);
    }

    protected override disposeInternal(): void {
      this._changeSubscription.unsubscribe();
      this._observer.dispose();
    }

    private readonly onChange = (change: IPropertyChange) => {
      const changeIndex = change.index as ITextDocumentIndex;
      if (
        changeIndex.lineIndex === this.id?.lineIndex &&
        changeIndex.pageIndex === this.id?.pageIndex
      ) {
        this.emitChange(change);
      }
    };
  }
`;

const indexAccessorCode = dedent`
  import { Injectable } from '@rs-x/core';
  import type { IIndexValueAccessor } from '@rs-x/core';

  @Injectable()
  export class TextDocumentIndexAccessor
    implements IIndexValueAccessor<TextDocument, ITextDocumentIndex>
  {
    public readonly priority = 200;

    // Tell rs-x which objects this accessor handles.
    public applies(object: unknown, _index: ITextDocumentIndex): boolean {
      return object instanceof TextDocument;
    }

    public hasValue(doc: TextDocument, index: ITextDocumentIndex): boolean {
      return doc.getLine(index) !== undefined;
    }

    public getValue(doc: TextDocument, index: ITextDocumentIndex): string | undefined {
      return doc.getLine(index);
    }

    // getResolvedValue is the same as getValue for synchronous types.
    // For async types (Promise, Observable) getValue returns the wrapper
    // and getResolvedValue returns the unwrapped value.
    public getResolvedValue(
      doc: TextDocument,
      index: ITextDocumentIndex,
    ): string | undefined {
      return doc.getLine(index);
    }

    public setValue(doc: TextDocument, index: ITextDocumentIndex, value: string): void {
      doc.setLine(index, value);
    }

    // rs-x iterates indexes to build initial dependency graph.
    // TextDocument doesn't expose enumerable indexes, so return empty.
    public getIndexes(): IterableIterator<ITextDocumentIndex> {
      return [].values();
    }
  }
`;

const factoriesCode = dedent`
  import { Injectable, Inject } from '@rs-x/core';
  import {
    IndexObserverProxyPairFactory,
    type IObjectObserverProxyPairFactory,
    type IObjectObserverProxyPairManager,
    type IObserverProxyPair,
    type IProxyTarget,
    type IPropertyInfo,
  } from '@rs-x/state-manager';

  // ① Object-level factory — wraps a whole TextDocument in a proxy.
  //    Used when stateManager.watchState(model, 'myBook', { ... }) is called.
  @Injectable()
  export class TextDocumentObserverProxyPairFactory
    implements IObjectObserverProxyPairFactory
  {
    public readonly priority = 100;

    constructor(
      @Inject(MyInjectTokens.TextDocumentObserverManager)
      private readonly _manager: TextDocumentObserverManager,
    ) {}

    public applies(object: unknown): boolean {
      return object instanceof TextDocument;
    }

    public create(
      _: IDisposableOwner,
      proxyTarget: IProxyTarget<TextDocument>,
    ): IObserverProxyPair<TextDocument> {
      const observer = this._manager.create(proxyTarget.target).instance;
      return {
        observer,
        proxy: observer.target as TextDocument,
        proxyTarget: proxyTarget.target,
      };
    }
  }

  // ② Index-level factory — watches a specific cell (pageIndex, lineIndex).
  //    Used when stateManager.watchState(doc, { pageIndex, lineIndex }) is called.
  @Injectable()
  export class TextDocumentIndexObserverProxyPairFactory extends IndexObserverProxyPairFactory<
    TextDocument,
    unknown
  > {
    constructor(
      @Inject(RsXStateManagerInjectionTokens.IObjectObserverProxyPairManager)
      objectObserverManager: IObjectObserverProxyPairManager,
      @Inject(MyInjectTokens.TextDocumentIndexObserverManager)
      indexObserverManager: TextDocumentIndexObserverManager,
      // ... further injection tokens omitted for brevity
    ) {
      super(objectObserverManager, Type.cast(indexObserverManager), ...);
    }

    public applies(object: unknown, propertyInfo: IPropertyInfo): boolean {
      const idx = propertyInfo.index as ITextDocumentIndex;
      return (
        object instanceof TextDocument &&
        idx?.lineIndex >= 0 &&
        idx?.pageIndex >= 0
      );
    }
  }
`;

const keyedFactoryCode = dedent`
  import { KeyedInstanceFactory, Injectable, Inject } from '@rs-x/core';

  // Ensures the same TextDocument always produces the same observer instance.
  // If two bindings both watch the same document, they share one observer.
  @Injectable()
  class TextDocumentObserverManager extends KeyedInstanceFactory<
    TextDocument,
    TextDocument,
    TextDocumentObserver
  > {
    constructor(
      @Inject(RsXCoreInjectionTokens.IProxyRegistry)
      private readonly _proxyRegister: IProxyRegistry,
    ) {
      super();
    }

    public override getId(doc: TextDocument): TextDocument {
      return doc; // identity by reference
    }

    protected override createId(doc: TextDocument): TextDocument {
      return doc;
    }

    protected override createInstance(doc: TextDocument): TextDocumentObserver {
      return new TextDocumentObserver(doc, this._proxyRegister, {
        canDispose: () => this.getReferenceCount(doc) === 1,
        release: () => this.release(doc),
      });
    }
  }
`;

const moduleRegistrationCode = dedent`
  import {
    ContainerModule,
    defaultIndexValueAccessorList,
    overrideMultiInjectServices,
    RsXCoreInjectionTokens,
  } from '@rs-x/core';
  import {
    defaultObjectObserverProxyPairFactoryList,
    defaultPropertyObserverProxyPairFactoryList,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule,
  } from '@rs-x/state-manager';
  import { InjectionContainer } from '@rs-x/core';

  const MyInjectTokens = {
    TextDocumentObserverManager:     Symbol('TextDocumentObserverManager'),
    TextDocumentIndexObserverManager: Symbol('TextDocumentIndexObserverManager'),
    TextDocumentIndexAccessor:        Symbol('TextDocumentIndexAccessor'),
    TextDocumentObserverProxyPairFactory:
      Symbol('TextDocumentObserverProxyPairFactory'),
    TextDocumentIndexObserverProxyPairFactory:
      Symbol('TextDocumentIndexObserverProxyPairFactory'),
  };

  // Load the base state-manager module first.
  await InjectionContainer.load(RsXStateManagerModule);

  const MyModule = new ContainerModule((options) => {
    // Singleton managers
    options
      .bind(MyInjectTokens.TextDocumentObserverManager)
      .to(TextDocumentObserverManager)
      .inSingletonScope();

    options
      .bind(MyInjectTokens.TextDocumentIndexObserverManager)
      .to(TextDocumentIndexObserverManager)
      .inSingletonScope();

    // Prepend the custom accessor — higher priority wins.
    overrideMultiInjectServices(
      options,
      RsXCoreInjectionTokens.IIndexValueAccessorList,
      [
        { target: TextDocumentIndexAccessor,
          token: MyInjectTokens.TextDocumentIndexAccessor },
        ...defaultIndexValueAccessorList,
      ],
    );

    // Object-level observer factory
    overrideMultiInjectServices(
      options,
      RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList,
      [
        { target: TextDocumentObserverProxyPairFactory,
          token: MyInjectTokens.TextDocumentObserverProxyPairFactory },
        ...defaultObjectObserverProxyPairFactoryList,
      ],
    );

    // Index-level observer factory
    overrideMultiInjectServices(
      options,
      RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryList,
      [
        { target: TextDocumentIndexObserverProxyPairFactory,
          token: MyInjectTokens.TextDocumentIndexObserverProxyPairFactory },
        ...defaultPropertyObserverProxyPairFactoryList,
      ],
    );
  });

  await InjectionContainer.load(MyModule);
`;

const watchWholeDocCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import {
    RsXStateManagerInjectionTokens,
    watchIndexRecursiveRule,
    type IStateManager,
  } from '@rs-x/state-manager';

  const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager,
  );

  const model = {
    myBook: new TextDocument([
      ['Once upon a time', 'Bla bla'],
      ['Page two line one', 'They lived happily ever after.'],
    ]),
  };

  // watchIndexRecursiveRule turns on recursive observation for all cells.
  stateManager.watchState(model, 'myBook', {
    indexWatchRule: watchIndexRecursiveRule,
  });

  stateManager.changed.subscribe(() => {
    console.log('Book changed:', model.myBook.toString());
  });

  // Mutating a cell via the model triggers the subscriber above.
  model.myBook.setLine({ pageIndex: 0, lineIndex: 1 }, 'In a far away land');
`;

const watchSingleCellCode = dedent`
  import { InjectionContainer, RsXCoreInjectionTokens, type IProxyRegistry } from '@rs-x/core';
  import {
    RsXStateManagerInjectionTokens,
    type IStateManager,
    type IStateChange,
  } from '@rs-x/state-manager';

  const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager,
  );
  const proxyRegistry: IProxyRegistry = InjectionContainer.get(
    RsXCoreInjectionTokens.IProxyRegistry,
  );

  const doc = new TextDocument([['Hello world', 'Second line', 'Third line']]);

  // Watch only one cell — the cell doesn't need to exist yet.
  const targetIndex = { pageIndex: 0, lineIndex: 2 };
  stateManager.watchState(doc, targetIndex);

  stateManager.changed.subscribe((change: IStateChange) => {
    const idx = change.index as ITextDocumentIndex;
    console.log(\`Cell (\${idx.pageIndex},\${idx.lineIndex}) → '\${change.newValue}'\`);
  });

  // Mutations must go through the proxy so the observer sees them.
  const docProxy: TextDocument = proxyRegistry.getProxy(doc);

  docProxy.setLine(targetIndex, 'a prince was born');   // emits change ✓
  docProxy.setLine({ pageIndex: 0, lineIndex: 0 }, 'a troll was born'); // silent ✓

  // Clean up
  stateManager.releaseState(doc, targetIndex);
`;

const expressionUsageCode = dedent`
  import {
    Injectable, InjectionContainer,
    type IIdentifierOwnerResolver,
    registerMultiInjectServices,
    RsXExpressionParserInjectionTokens,
    rsx, RsXExpressionParserModule,
  } from '@rs-x/expression-parser';

  // ── 5th contract: tell the expression parser that TextDocument
  //    owns ITextDocumentIndex keys ─────────────────────────────
  @Injectable()
  class TextDocumentIndexOwnerResolver implements IIdentifierOwnerResolver {
    resolve(index: unknown, context: unknown): object | null {
      if (!(context instanceof TextDocument)) return null;
      const idx = index as ITextDocumentIndex;
      if (typeof idx?.pageIndex !== 'number') return null;
      if (typeof idx?.lineIndex !== 'number') return null;
      return context; // doc is the owner of its cell indices
    }
  }

  // Register in MyModule (alongside the other overrideMultiInjectServices calls):
  registerMultiInjectServices(
    options,
    RsXExpressionParserInjectionTokens.IIdentifierOwnerResolverList,
    [{ target: TextDocumentIndexOwnerResolver, token: MyTokens.TextDocumentIndexOwnerResolver }],
  );

  // ── usage ──────────────────────────────────────────────────────
  InjectionContainer.load(RsXExpressionParserModule);
  InjectionContainer.load(MyModule);

  const doc = new TextDocument([
    ['Welcome', 'Hello world'],
    ['Chapter 1', 'Once upon a time'],
  ]);

  // Store the index as a model field — an inline object literal creates a new
  // object on every evaluation, breaking the accessor's identity checks.
  const model = {
    doc,
    cell: { pageIndex: 1, lineIndex: 0 } as ITextDocumentIndex,
  };

  const expr = rsx<string>('doc[cell]')(model);
  await new WaitForEvent(expr, 'changed').wait(() => {});
  console.log(expr.value); // 'Chapter 1'

  // Changing 'cell' re-evaluates against the new address.
  model.cell = { pageIndex: 0, lineIndex: 0 };
  // After change propagation: expr.value → 'Welcome'

  // Mutations via proxy also propagate (requires the owner resolver above).
  const proxy = proxyRegistry.getProxy<TextDocument>(doc);
  proxy.setLine({ pageIndex: 0, lineIndex: 0 }, 'Updated!');
  // After change propagation: expr.value → 'Updated!'
`;

// ─── page ─────────────────────────────────────────────────────────────────────

export default function CustomDataTypesPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'Custom data types' },
            ]}
          />
          <p className="docsApiEyebrow">Advanced</p>
          <h1 className="sectionTitle">Custom data types</h1>
          <p className="sectionLead docsApiLead">
            Teach rs-x to observe any object — custom classes, domain models, or
            third-party structures — by implementing four small contracts: an
            observer, a proxy factory, an index accessor, and a DI module that
            wires them together.
          </p>
        </div>
        <div className="docsApiActions docsApiActionsTitle">
          <CustomDataTypesDownloadButton />
          <Link className="btn btnGhost" href="/docs/observation">
            Observation strategy <span aria-hidden="true">→</span>
          </Link>
          <Link className="btn btnGhost" href="/docs/index-watch-rule">
            IIndexWatchRule <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <div className="docsApiGrid">
        {/* ── overview ── */}
        <article className="card docsApiCard">
          <h2 className="cardTitle">Why custom data types?</h2>
          <p className="cardText">
            rs-x ships with built-in observation support for plain objects,
            Arrays, Maps, Sets, Dates, Promises, and Observables. When your
            domain model contains a type that does not fit any of those
            categories — for example a paginated document, a binary buffer, or a
            third-party class whose mutations go through a custom API — you can
            extend the system without modifying the core library.
          </p>
          <p className="cardText">
            The extension point is a set of injectable services registered via
            Inversify{`'`}s <span className="codeInline">ContainerModule</span>{' '}
            and the{' '}
            <span className="codeInline">overrideMultiInjectServices</span>{' '}
            helper. Once registered, rs-x automatically uses your implementation
            wherever it encounters an instance of your type.
          </p>
        </article>

        {/* ── running example ── */}
        <article className="card docsApiCard">
          <h2 className="cardTitle">Running example: TextDocument</h2>
          <p className="cardText">
            The demo throughout this page uses a{' '}
            <span className="codeInline">TextDocument</span> — a multi-page text
            structure addressed by a compound index{' '}
            <span className="codeInline">{'{ pageIndex, lineIndex }'}</span>. A
            standard plain-object or array accessor cannot handle this compound
            index, so we implement every contract ourselves.
          </p>
          <SyntaxCodeBlock code={textDocumentClassCode} />
        </article>

        {/* ── four contracts overview ── */}
        <article className="card docsApiCard">
          <h2 className="cardTitle">The four contracts</h2>
          <p className="cardText">
            Supporting a new data type requires implementing the following
            pieces, each of which is described in detail below:
          </p>
          <ul className="advancedTopicList">
            <li>
              <strong>Observer</strong> — extends{' '}
              <span className="codeInline">AbstractObserver</span> and wraps the
              custom object in a <span className="codeInline">Proxy</span> that
              intercepts mutations and emits{' '}
              <span className="codeInline">IPropertyChange</span> events.
            </li>
            <li>
              <strong>Index observer</strong> — extends{' '}
              <span className="codeInline">AbstractObserver</span> and watches a
              single logical slot (cell, bucket, key) inside the object. Filters
              change events by index identity.
            </li>
            <li>
              <strong>Index value accessor</strong> — implements{' '}
              <span className="codeInline">IIndexValueAccessor</span> and
              teaches rs-x how to read and write individual slots without going
              through the proxy.
            </li>
            <li>
              <strong>Observer proxy pair factories</strong> — tell the state
              manager how to create (and share) observers when{' '}
              <span className="codeInline">watchState</span> is called at the
              object level or at the index level.
            </li>
          </ul>
        </article>

        {/* ── step 1: observer ── */}
        <article className="card docsApiCard">
          <h2 className="cardTitle">Step 1 — Object observer</h2>
          <p className="cardText">
            The object observer wraps the entire{' '}
            <span className="codeInline">TextDocument</span> in a{' '}
            <span className="codeInline">Proxy</span>. When{' '}
            <span className="codeInline">setLine</span> is intercepted, it calls
            the real method and then calls{' '}
            <span className="codeInline">emitChange</span> with an{' '}
            <span className="codeInline">IPropertyChange</span> that carries the
            compound index. All downstream index observers listen to this single
            change stream and filter by their own index.
          </p>
          <p className="cardText">
            The observer also registers the proxy with{' '}
            <span className="codeInline">IProxyRegistry</span> so that rs-x can
            detect, at any point, whether an object reference is already a proxy
            — preventing double-wrapping.
          </p>
          <SyntaxCodeBlock code={observerCode} />
        </article>

        {/* ── step 2: index observer ── */}
        <article className="card docsApiCard">
          <h2 className="cardTitle">Step 2 — Index observer</h2>
          <p className="cardText">
            The index observer watches a single cell inside a document. It
            subscribes to the parent{' '}
            <span className="codeInline">TextDocumentObserver</span>
            {`'`}s change stream and re-emits only the events whose{' '}
            <span className="codeInline">pageIndex</span> and{' '}
            <span className="codeInline">lineIndex</span> match. This is the
            same pattern as the built-in{' '}
            <span className="codeInline">ArrayIndexObserver</span>, which
            filters array-change events by slot index.
          </p>
          <p className="cardText">
            The index observer receives the initial cell value in its
            constructor so that the expression has a value immediately on bind
            without waiting for the first mutation.
          </p>
          <SyntaxCodeBlock code={indexObserverCode} />
        </article>

        {/* ── step 3: index accessor ── */}
        <article className="card docsApiCard">
          <h2 className="cardTitle">Step 3 — Index value accessor</h2>
          <p className="cardText">
            <span className="codeInline">IIndexValueAccessor</span> is the
            bridge between the rs-x expression pipeline and a custom indexed
            collection. It answers: "Given an object and an index, how do I read
            and write a value?" The{' '}
            <span className="codeInline">applies(object, index)</span> guard
            ensures the accessor is only invoked for{' '}
            <span className="codeInline">TextDocument</span> instances with
            valid <span className="codeInline">ITextDocumentIndex</span> values.
          </p>
          <p className="cardText">
            <span className="codeInline">getResolvedValue</span> exists for
            async types such as Promises, where{' '}
            <span className="codeInline">getValue</span> returns the Promise
            wrapper while <span className="codeInline">getResolvedValue</span>{' '}
            returns the unwrapped result. For synchronous custom types both
            methods return the same thing.
          </p>
          <SyntaxCodeBlock code={indexAccessorCode} />
        </article>

        {/* ── step 4: keyed factory ── */}
        <article className="card docsApiCard">
          <h2 className="cardTitle">Step 4 — Shared observer management</h2>
          <p className="cardText">
            <span className="codeInline">KeyedInstanceFactory</span> is a
            reference-counted cache keyed by identity. If two bindings both
            watch the same <span className="codeInline">TextDocument</span>{' '}
            instance, they share a single{' '}
            <span className="codeInline">TextDocumentObserver</span>. When the
            last binding is disposed the observer is released automatically.
          </p>
          <p className="cardText">
            The{' '}
            <span className="codeInline">TextDocumentIndexObserverManager</span>{' '}
            follows the same pattern but is keyed by both document identity and
            cell index, using a Cantor pairing function to produce a unique
            numeric ID from{' '}
            <span className="codeInline">{'{ pageIndex, lineIndex }'}</span>.
          </p>
          <SyntaxCodeBlock code={keyedFactoryCode} />
        </article>

        {/* ── step 5: factories ── */}
        <article className="card docsApiCard">
          <h2 className="cardTitle">Step 5 — Observer proxy pair factories</h2>
          <p className="cardText">
            The state manager discovers how to wrap an object by asking its list
            of registered factories (in priority order) which one{' '}
            <span className="codeInline">applies</span>. Two factories are
            needed:
          </p>
          <ul className="advancedTopicList">
            <li>
              <strong>Object-level factory</strong> (
              <span className="codeInline">
                TextDocumentObserverProxyPairFactory
              </span>
              ) — invoked when the whole document is passed to{' '}
              <span className="codeInline">watchState</span>. Returns a proxy /
              observer pair for the document.
            </li>
            <li>
              <strong>Index-level factory</strong> (
              <span className="codeInline">
                TextDocumentIndexObserverProxyPairFactory
              </span>
              ) — invoked when a compound index is passed to{' '}
              <span className="codeInline">watchState</span>. Extends{' '}
              <span className="codeInline">IndexObserverProxyPairFactory</span>,
              which handles the boilerplate of combining the object observer
              with a per-slot index observer.
            </li>
          </ul>
          <SyntaxCodeBlock code={factoriesCode} />
        </article>

        {/* ── step 6: DI registration ── */}
        <article className="card docsApiCard">
          <h2 className="cardTitle">Step 6 — DI registration</h2>
          <p className="cardText">
            All custom services are wired together in a{' '}
            <span className="codeInline">ContainerModule</span>. The key helper
            is <span className="codeInline">overrideMultiInjectServices</span>,
            which replaces the default multi-inject list with a new list that
            prepends your implementation. Always spread the default list at the
            end so that built-in support for Array, Map, Set, Date, etc.
            continues to work for all other types in the same application.
          </p>
          <p className="cardText">Three lists need to be extended:</p>
          <ul className="advancedTopicList">
            <li>
              <span className="codeInline">IIndexValueAccessorList</span> —
              register the custom index accessor.
            </li>
            <li>
              <span className="codeInline">
                IObjectObserverProxyPairFactoryList
              </span>{' '}
              — register the object-level factory.
            </li>
            <li>
              <span className="codeInline">
                IPropertyObserverProxyPairFactoryList
              </span>{' '}
              — register the index-level factory.
            </li>
          </ul>
          <SyntaxCodeBlock code={moduleRegistrationCode} />
        </article>

        {/* ── usage: watch whole doc ── */}
        <article className="card docsApiCard">
          <h2 className="cardTitle">Usage — watch entire document</h2>
          <p className="cardText">
            Once the module is loaded, pass a{' '}
            <span className="codeInline">TextDocument</span> to{' '}
            <span className="codeInline">watchState</span> just like any other
            value. The{' '}
            <span className="codeInline">watchIndexRecursiveRule</span> enables
            recursive observation so that every cell mutation triggers the
            subscriber.
          </p>
          <SyntaxCodeBlock code={watchWholeDocCode} />
        </article>

        {/* ── usage: watch single cell ── */}
        <article className="card docsApiCard">
          <h2 className="cardTitle">Usage — watch a single cell</h2>
          <p className="cardText">
            Pass the compound index directly to{' '}
            <span className="codeInline">watchState</span> to watch a specific
            cell. The cell does not need to exist at watch time — as soon as{' '}
            <span className="codeInline">setLine</span> writes to that index the
            change is emitted. Mutations must go through the proxy obtained from{' '}
            <span className="codeInline">IProxyRegistry</span> so that the
            observer intercepts them.
          </p>
          <SyntaxCodeBlock code={watchSingleCellCode} />
        </article>

        {/* ── usage: expressions ── */}
        <article className="card docsApiCard">
          <h2 className="cardTitle">Usage — bind in expressions</h2>
          <p className="cardText">
            The custom index accessor is also picked up by the expression
            parser. An expression like{' '}
            <span className="codeInline">rsx({`'doc[cell]'`})(model)</span>{' '}
            delegates to{' '}
            <span className="codeInline">TextDocumentIndexAccessor</span> to
            read the cell value. The expression re-evaluates reactively when
            either the cell address (
            <span className="codeInline">model.cell</span>) or the document
            itself (<span className="codeInline">model.doc</span>) changes.
          </p>
          <p className="cardText">
            For proxy mutations to be detected — when{' '}
            <span className="codeInline">proxy.setLine(...)</span> is called —
            you also need a{' '}
            <span className="codeInline">IIdentifierOwnerResolver</span> that
            tells the expression parser that a{' '}
            <span className="codeInline">TextDocument</span> owns its{' '}
            <span className="codeInline">ITextDocumentIndex</span> keys. Without
            it the slot subscription cannot be set up on the right object.
          </p>
          <p className="cardText">
            <strong>Always store the index as a model field</strong> rather than
            an inline object literal —{' '}
            <span className="codeInline">
              doc[{'{ pageIndex: 1, lineIndex: 0 }'}]
            </span>{' '}
            creates a new object on every evaluation, breaking the accessor{`'`}
            s identity checks.
          </p>
          <p className="cardText">
            <em>Note:</em> this example requires{' '}
            <span className="codeInline">MyModule</span> to be loaded in the DI
            container before binding. It cannot be demonstrated in the online
            playground because the playground runs in an isolated environment
            where custom DI modules cannot be registered.
          </p>
          <SyntaxCodeBlock code={expressionUsageCode} />
        </article>

        {/* ── summary card ── */}
        <aside
          className="qsCodeCard docsApiCode"
          aria-label="Custom data type checklist"
        >
          <div className="qsCodeHeader">
            <div className="qsCodeTitle">Checklist</div>
          </div>
          <SyntaxCodeBlock
            code={dedent`
              // 1) Implement AbstractObserver — wrap with Proxy,
              //    call emitChange() on every mutation.
              //
              // 2) Implement AbstractObserver for index-level watching —
              //    subscribe to parent observer, filter by index.
              //
              // 3) Implement IIndexValueAccessor — getValue / setValue /
              //    getResolvedValue / hasValue / applies.
              //
              // 4) Implement IObjectObserverProxyPairFactory (object level)
              //    and extend IndexObserverProxyPairFactory (index level).
              //
              // 5) Use KeyedInstanceFactory for shared observer instances.
              //
              // 6) Register all services via overrideMultiInjectServices
              //    in a ContainerModule. Always keep default lists at the end.
              //
              // 7) For rsx() expression support with proxy mutation detection,
              //    implement IIdentifierOwnerResolver so the expression parser
              //    can bind the slot to the correct owner object.
            `}
          />
        </aside>
      </div>
    </DocsPageTemplate>
  );
}
