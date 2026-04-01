/**
 * Demo: custom data type with rsx expression binding.
 * Verifies the docs page claim that rsx('doc[cell]')(model) works once
 * the full custom module (observer + factories + accessor) is loaded.
 */

import { ReplaySubject, type Subscription } from 'rxjs';

import {
  ContainerModule,
  defaultIndexValueAccessorList,
  type IDisposableOwner,
  type IErrorLog,
  type IIndexValueAccessor,
  Inject,
  Injectable,
  InjectionContainer,
  type IPropertyChange,
  type IProxyRegistry,
  type IValueMetadata,
  KeyedInstanceFactory,
  overrideMultiInjectServices,
  registerMultiInjectServices,
  RsXCoreInjectionTokens,
  Type,
  WaitForEvent,
} from '@rs-x/core';
import {
  type IIdentifierOwnerResolver,
  rsx,
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
} from '@rs-x/expression-parser';
import {
  AbstractObserver,
  defaultObjectObserverProxyPairFactoryList,
  defaultPropertyObserverProxyPairFactoryList,
  type IIndexObserverInfo,
  IndexObserverProxyPairFactory,
  type IObjectObserverProxyPairFactory,
  type IObjectObserverProxyPairManager,
  type IObserverProxyPair,
  type IPropertyInfo,
  type IProxyTarget,
  RsXStateManagerInjectionTokens,
} from '@rs-x/state-manager';

// ─── domain model ─────────────────────────────────────────────────────────────

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

// ─── DI tokens ────────────────────────────────────────────────────────────────

const MyTokens = {
  TextDocumentObserverManager: Symbol('TextDocumentObserverManager'),
  TextDocumentIndexObserverManager: Symbol('TextDocumentIndexObserverManager'),
  TextDocumentIndexAccessor: Symbol('TextDocumentIndexAccessor'),
  TextDocumentObserverProxyPairFactory: Symbol(
    'TextDocumentObserverProxyPairFactory',
  ),
  TextDocumentIndexObserverProxyPairFactory: Symbol(
    'TextDocumentIndexObserverProxyPairFactory',
  ),
  TextDocumentIndexOwnerResolver: Symbol('TextDocumentIndexOwnerResolver'),
};

// ─── observers ────────────────────────────────────────────────────────────────

class TextDocumentObserver extends AbstractObserver<TextDocument> {
  constructor(
    textDocument: TextDocument,
    private readonly _proxyRegister: IProxyRegistry,
    owner?: IDisposableOwner,
  ) {
    super(owner, Type.cast(undefined), textDocument);
    this.target = new Proxy(textDocument, this);
    this._proxyRegister.register(textDocument, this.target);
  }

  protected override disposeInternal(): void {
    this._proxyRegister.unregister(this.value);
  }

  public get(
    doc: TextDocument,
    property: PropertyKey,
    receiver: unknown,
  ): unknown {
    if (property === 'setLine') {
      return (index: ITextDocumentIndex, text: string) => {
        doc.setLine(index, text);
        this.emitChange({ arguments: [], index, target: doc, newValue: text });
      };
    }
    return Reflect.get(doc, property, receiver);
  }
}

class TextDocumentIndexObserver extends AbstractObserver<
  TextDocument,
  string,
  ITextDocumentIndex
> {
  private readonly _sub: Subscription;

  constructor(
    owner: IDisposableOwner,
    private readonly _obs: TextDocumentObserver,
    index: ITextDocumentIndex,
  ) {
    super(
      owner,
      _obs.target,
      _obs.target.getLine(index),
      new ReplaySubject(),
      index,
    );
    this._sub = _obs.changed.subscribe(this._onChange);
  }

  protected override disposeInternal(): void {
    this._sub.unsubscribe();
    this._obs.dispose();
  }

  private readonly _onChange = (change: IPropertyChange) => {
    const idx = change.index as ITextDocumentIndex;
    if (
      idx?.lineIndex === this.id?.lineIndex &&
      idx?.pageIndex === this.id?.pageIndex
    ) {
      this.emitChange(change);
    }
  };
}

// ─── keyed factories ──────────────────────────────────────────────────────────

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
    return doc;
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

class IndexForDocumentObserverManager extends KeyedInstanceFactory<
  number,
  IIndexObserverInfo<ITextDocumentIndex>,
  TextDocumentIndexObserver
> {
  constructor(
    private readonly _doc: TextDocument,
    private readonly _docMgr: TextDocumentObserverManager,
    private readonly _releaseOwner: () => void,
  ) {
    super();
  }

  public override getId(info: IIndexObserverInfo<ITextDocumentIndex>): number {
    return this._id(info);
  }
  protected override createId(
    info: IIndexObserverInfo<ITextDocumentIndex>,
  ): number {
    return this._id(info);
  }
  private _id({
    index: { pageIndex, lineIndex },
  }: IIndexObserverInfo<ITextDocumentIndex>): number {
    return (
      ((pageIndex + lineIndex) * (pageIndex + lineIndex + 1)) / 2 + lineIndex
    );
  }
  protected override createInstance(
    info: IIndexObserverInfo<ITextDocumentIndex>,
    id: number,
  ): TextDocumentIndexObserver {
    const obs = this._docMgr.create(this._doc).instance;
    return new TextDocumentIndexObserver(
      {
        canDispose: () => this.getReferenceCount(id) === 1,
        release: () => {
          obs.dispose();
          this.release(id);
        },
      },
      obs,
      info.index,
    );
  }
  protected override onReleased(): void {
    if (this.isEmpty) this._releaseOwner();
  }
}

@Injectable()
class TextDocumentIndexObserverManager extends KeyedInstanceFactory<
  TextDocument,
  TextDocument,
  IndexForDocumentObserverManager
> {
  constructor(
    @Inject(MyTokens.TextDocumentObserverManager)
    private readonly _docMgr: TextDocumentObserverManager,
  ) {
    super();
  }

  public override getId(doc: TextDocument): TextDocument {
    return doc;
  }
  protected override createId(doc: TextDocument): TextDocument {
    return doc;
  }
  protected override createInstance(
    doc: TextDocument,
  ): IndexForDocumentObserverManager {
    return new IndexForDocumentObserverManager(doc, this._docMgr, () =>
      this.release(doc),
    );
  }
  protected override releaseInstance(
    mgr: IndexForDocumentObserverManager,
  ): void {
    mgr.dispose();
  }
}

// ─── observer proxy pair factories ────────────────────────────────────────────

@Injectable()
class TextDocumentObserverProxyPairFactory implements IObjectObserverProxyPairFactory {
  public readonly priority = 100;
  constructor(
    @Inject(MyTokens.TextDocumentObserverManager)
    private readonly _mgr: TextDocumentObserverManager,
  ) {}
  public applies(object: unknown): boolean {
    return object instanceof TextDocument;
  }
  public create(
    _: IDisposableOwner,
    proxyTarget: IProxyTarget<TextDocument>,
  ): IObserverProxyPair<TextDocument> {
    const observer = this._mgr.create(proxyTarget.target).instance;
    return {
      observer,
      proxy: observer.target as TextDocument,
      proxyTarget: proxyTarget.target,
    };
  }
}

@Injectable()
class TextDocumentIndexObserverProxyPairFactory extends IndexObserverProxyPairFactory<
  TextDocument,
  unknown
> {
  constructor(
    @Inject(RsXStateManagerInjectionTokens.IObjectObserverProxyPairManager)
    objectObserverManager: IObjectObserverProxyPairManager,
    @Inject(MyTokens.TextDocumentIndexObserverManager)
    indexObserverManager: TextDocumentIndexObserverManager,
    @Inject(RsXCoreInjectionTokens.IErrorLog) errorLog: IErrorLog,
    @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
    indexValueAccessor: IIndexValueAccessor,
    @Inject(RsXCoreInjectionTokens.IProxyRegistry)
    proxyRegister: IProxyRegistry,
    @Inject(RsXCoreInjectionTokens.IValueMetadata)
    valueMetadata: IValueMetadata,
  ) {
    super(
      objectObserverManager,
      Type.cast(indexObserverManager),
      errorLog,
      indexValueAccessor,
      proxyRegister,
      valueMetadata,
    );
  }
  public applies(object: unknown, propertyInfo: IPropertyInfo): boolean {
    const idx = propertyInfo.index as ITextDocumentIndex;
    return (
      object instanceof TextDocument &&
      typeof idx?.lineIndex === 'number' &&
      typeof idx?.pageIndex === 'number'
    );
  }
}

// ─── index value accessor ─────────────────────────────────────────────────────

@Injectable()
class TextDocumentIndexAccessor implements IIndexValueAccessor<
  TextDocument,
  ITextDocumentIndex
> {
  public readonly priority = 200;
  public applies(object: unknown, index: ITextDocumentIndex): boolean {
    return (
      object instanceof TextDocument &&
      typeof index?.pageIndex === 'number' &&
      typeof index?.lineIndex === 'number'
    );
  }
  public hasValue(doc: TextDocument, index: ITextDocumentIndex): boolean {
    return doc.getLine(index) !== undefined;
  }
  public getValue(
    doc: TextDocument,
    index: ITextDocumentIndex,
  ): string | undefined {
    return doc.getLine(index);
  }
  public getResolvedValue(
    doc: TextDocument,
    index: ITextDocumentIndex,
  ): string | undefined {
    return doc.getLine(index);
  }
  public setValue(
    doc: TextDocument,
    index: ITextDocumentIndex,
    value: string,
  ): void {
    doc.setLine(index, value);
  }
  public getIndexes(): IterableIterator<ITextDocumentIndex> {
    return [].values();
  }
}

// ─── identifier owner resolver ────────────────────────────────────────────────

@Injectable()
class TextDocumentIndexOwnerResolver implements IIdentifierOwnerResolver {
  public resolve(index: unknown, context: unknown): object | null {
    if (!(context instanceof TextDocument)) return null;
    const idx = index as ITextDocumentIndex;
    if (
      typeof idx?.pageIndex !== 'number' ||
      typeof idx?.lineIndex !== 'number'
    )
      return null;
    return context;
  }
}

// ─── module ───────────────────────────────────────────────────────────────────

InjectionContainer.load(RsXExpressionParserModule);

const MyModule = new ContainerModule((options) => {
  options
    .bind(MyTokens.TextDocumentObserverManager)
    .to(TextDocumentObserverManager)
    .inSingletonScope();
  options
    .bind(MyTokens.TextDocumentIndexObserverManager)
    .to(TextDocumentIndexObserverManager)
    .inSingletonScope();

  overrideMultiInjectServices(
    options,
    RsXCoreInjectionTokens.IIndexValueAccessorList,
    [
      {
        target: TextDocumentIndexAccessor,
        token: MyTokens.TextDocumentIndexAccessor,
      },
      ...defaultIndexValueAccessorList,
    ],
  );
  overrideMultiInjectServices(
    options,
    RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList,
    [
      {
        target: TextDocumentObserverProxyPairFactory,
        token: MyTokens.TextDocumentObserverProxyPairFactory,
      },
      ...defaultObjectObserverProxyPairFactoryList,
    ],
  );
  overrideMultiInjectServices(
    options,
    RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryList,
    [
      {
        target: TextDocumentIndexObserverProxyPairFactory,
        token: MyTokens.TextDocumentIndexObserverProxyPairFactory,
      },
      ...defaultPropertyObserverProxyPairFactoryList,
    ],
  );
  registerMultiInjectServices(
    options,
    RsXExpressionParserInjectionTokens.IIdentifierOwnerResolverList,
    [
      {
        target: TextDocumentIndexOwnerResolver,
        token: MyTokens.TextDocumentIndexOwnerResolver,
      },
    ],
  );
});

InjectionContainer.load(MyModule);

// ─── test scenarios ───────────────────────────────────────────────────────────

const proxyRegistry = InjectionContainer.get<IProxyRegistry>(
  RsXCoreInjectionTokens.IProxyRegistry,
);
const emptyFn = () => {};

async function testInitialRead(): Promise<void> {
  const doc = new TextDocument([
    ['Welcome', 'Hello world'],
    ['Chapter 1', 'Once upon a time'],
  ]);
  const model = {
    doc,
    cell: { pageIndex: 1, lineIndex: 0 } as ITextDocumentIndex,
  };

  const expr = rsx<string>('doc[cell]')(model);
  await new WaitForEvent(expr, 'changed').wait(emptyFn);
  console.log(`initial read: ${expr.value}`); // Chapter 1
}

async function testCellAddressChange(): Promise<void> {
  const doc = new TextDocument([
    ['Welcome', 'Hello world'],
    ['Chapter 1', 'Once upon a time'],
  ]);
  const model = {
    doc,
    cell: { pageIndex: 0, lineIndex: 0 } as ITextDocumentIndex,
  };

  const expr = rsx<string>('doc[cell]')(model);
  await new WaitForEvent(expr, 'changed').wait(emptyFn);
  console.log(`before cell change: ${expr.value}`); // Welcome

  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true }).wait(
    () => {
      model.cell = { pageIndex: 1, lineIndex: 1 };
    },
  );
  console.log(`after cell change: ${expr.value}`); // Once upon a time
}

async function testProxyMutation(): Promise<void> {
  const doc = new TextDocument([['original text']]);
  const model = {
    doc,
    cell: { pageIndex: 0, lineIndex: 0 } as ITextDocumentIndex,
  };

  const expr = rsx<string>('doc[cell]')(model);
  await new WaitForEvent(expr, 'changed').wait(emptyFn);
  console.log(`before mutation: ${expr.value}`); // original text

  const proxy = proxyRegistry.getProxy<TextDocument>(doc);
  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true }).wait(
    () => {
      proxy.setLine({ pageIndex: 0, lineIndex: 0 }, 'updated text');
    },
  );
  console.log(`after mutation: ${expr.value}`); // updated text
}

export const run = (async () => {
  await testInitialRead();
  await testCellAddressChange();
  await testProxyMutation();
})();
