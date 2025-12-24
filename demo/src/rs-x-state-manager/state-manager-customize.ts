import {
    IDisposableOwner,
    IErrorLog,
    IIndexValueAccessor,
    IndexAccessor,
    Inject,
    Injectable,
    InjectionContainer,
    IPropertyChange,
    RsXCoreInjectionTokens,
    SingletonFactory,
    truePredicate
} from '@rs-x/core';
import {
    AbstractObserver,
    IIndexObserverInfo,
    IndexObserverFactory,
    IndexObserverProxyPairFactory,
    IObjectObserverProxyPairFactory,
    IObjectObserverProxyPairManager,
    IObserverProxyPair,
    IPropertyInfo,
    IProxyRegistry,
    IProxyTarget,
    IStateChange,
    IStateManager,
    ObjectObserverFactory,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';
import { ReplaySubject, Subscription } from 'rxjs';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

class IndexForTextDocumentxObserverManager
    extends SingletonFactory<
        number,
        IIndexObserverInfo<ITextDocumentIndex>,
        TextDocumentIndexObserver> {
    constructor(
        private readonly _textDocument: TextDocument,
        private readonly _textDocumentObserverManager: TextDocumentObserverManager,
        private readonly releaseOwner: () => void
    ) {
        super();
    }

    public override getId(indexObserverInfo: IIndexObserverInfo<ITextDocumentIndex>): number {
        return this.createId(indexObserverInfo);
    }

    protected override createInstance(indexObserverInfo: IIndexObserverInfo<ITextDocumentIndex>, id: number): TextDocumentIndexObserver {
        const textDocumentObserver = this._textDocumentObserverManager.create(this._textDocument).instance;
        return new TextDocumentIndexObserver(
            {
                canDispose: () => this.getReferenceCount(id) === 1,
                release: () => {
                    textDocumentObserver.dispose();
                    this.release(id);
                },
            },
            textDocumentObserver, indexObserverInfo.index
        );
    }

    protected override createId(indexObserverInfo: IIndexObserverInfo<ITextDocumentIndex>): number {
        // Using Cantor pairing to create a unique id from page and line index
        const { pageIndex, lineIndex } = indexObserverInfo.index;
        return ((pageIndex + lineIndex) * (pageIndex + lineIndex + 1)) / 2 + lineIndex;
    }

    protected override onReleased(): void {
        if (this.isEmpty) {
            this.releaseOwner();
        }
    }
}

// We want to ensure that for the same TextDocument we always have the same observer
@Injectable()
class TextDocumentObserverManager extends SingletonFactory<TextDocument, TextDocument, TextDocumentObserver> {
    constructor(
        @Inject(RsXStateManagerInjectionTokens.IProxyRegistry)
        private readonly _proxyRegister: IProxyRegistry) {
        super();
    }

    public override getId(textDocument: TextDocument): TextDocument {
        return textDocument;
    }

    protected override createInstance(textDocument: TextDocument, id: TextDocument): TextDocumentObserver {
        return new TextDocumentObserver(
            textDocument,
            this._proxyRegister,
            {
                canDispose: () => this.getReferenceCount(id) === 1,
                release: () => this.release(id)
            }
        );
    }

    protected override createId(textDocument: TextDocument): TextDocument {
        return textDocument;
    }
}

// We want to ensure we create only one index-manager per TextDocument
@Injectable()
export class TextDocumenIndexObserverManager
    extends SingletonFactory<
        TextDocument,
        TextDocument,
        IndexForTextDocumentxObserverManager
    > {
    constructor(
        @Inject(TextDocumentObserverManager)
        private readonly _textDocumentObserverManager: TextDocumentObserverManager,
    ) {
        super();
    }

    public override getId(textDocument: TextDocument): TextDocument {
        return textDocument;
    }

    protected override createId(textDocument: TextDocument): TextDocument {
        return textDocument;
    }

    protected override createInstance(
        textDocument: TextDocument
    ): IndexForTextDocumentxObserverManager {

        return new IndexForTextDocumentxObserverManager(textDocument, this._textDocumentObserverManager, () => this.release(textDocument));
    }

    protected override releaseInstance(
        indexForTextDocumentxObserverManager: IndexForTextDocumentxObserverManager
    ): void {
        indexForTextDocumentxObserverManager.dispose();
    }
}

// Normally we would create our own module
// But for simplicity we bind our services directly to the injection container
InjectionContainer.bind(TextDocumentObserverManager).to(TextDocumentObserverManager).inSingletonScope();
InjectionContainer.bind(TextDocumenIndexObserverManager).to(TextDocumenIndexObserverManager).inSingletonScope();

@IndexAccessor()
export class TextDocumentIndexAccessor implements IIndexValueAccessor<TextDocument, ITextDocumentIndex> {

    public hasValue(context: TextDocument, index: ITextDocumentIndex): boolean {
        return context.getLine(index) !== undefined;
    }

    // We don’t have any properties that can be iterated through.
    public getIndexes(_context: TextDocument, _index?: ITextDocumentIndex): IterableIterator<ITextDocumentIndex> {
        return [].values();
    }

    // Indicate whether the value is async. For example when the value is a Promise
    public isAsync(_context: TextDocument, _index: ITextDocumentIndex): boolean {
        return false;
    }

    // Here it is the same as getValue.
    // For example, for a Promise accessor getValue returns the promise
    // and getResolvedValue returns the resolved promise value
    public getResolvedValue(context: TextDocument, index: ITextDocumentIndex): string {
        return this.getValue(context, index);
    }

    public getValue(context: TextDocument, index: ITextDocumentIndex): string {
        return context.getLine(index);
    }

    public setValue(context: TextDocument, index: ITextDocumentIndex, value: string): void {
        context.setLine(index, value);
    }

    public applies(context: unknown, _index: ITextDocumentIndex): boolean {
        return context instanceof TextDocument;
    }
}

@IndexObserverFactory()
export class TextDocumentInxdexObserverProxyPairFactory extends IndexObserverProxyPairFactory<TextDocument, unknown> {
    constructor(
        @Inject(RsXStateManagerInjectionTokens.IObjectObserverProxyPairManager)
        objectObserverManager: IObjectObserverProxyPairManager,
        @Inject(TextDocumenIndexObserverManager)
        textDocumenIndexObserverManager: TextDocumenIndexObserverManager,
        @Inject(RsXCoreInjectionTokens.IErrorLog)
        errorLog: IErrorLog,
        @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
        indexValueAccessor: IIndexValueAccessor,
        @Inject(RsXStateManagerInjectionTokens.IProxyRegistry)
        proxyRegister: IProxyRegistry
    ) {
        super(
            objectObserverManager,
            textDocumenIndexObserverManager,
            errorLog,
            indexValueAccessor,
            proxyRegister
        );
    }

    public applies(object: unknown, propertyInfo: IPropertyInfo): boolean {
        const documentKey = propertyInfo.key as ITextDocumentIndex;
        return object instanceof TextDocument && documentKey?.lineIndex >= 0 && documentKey?.pageIndex >= 0;
    }
}

@ObjectObserverFactory()
export class TextDocumentObserverProxyPairFactory implements IObjectObserverProxyPairFactory {
    constructor(
        @Inject(TextDocumentObserverManager)
        private readonly _textDocumentObserverManager: TextDocumentObserverManager) { }

    public create(
        _: IDisposableOwner,
        proxyTarget: IProxyTarget<TextDocument>): IObserverProxyPair<TextDocument> {

        const observer = this._textDocumentObserverManager.create(proxyTarget.target).instance;
        return {
            observer,
            proxy: observer.target as TextDocument,
            proxyTarget: proxyTarget.target,
        };
    }

    public applies(object: unknown): boolean {
        return object instanceof TextDocument;
    }
}

interface ITextDocumentIndex {
    pageIndex: number;
    lineIndex: number;
}

class TextDocument {
    private readonly _pages = new Map<number, Map<number, string>>();
    constructor(
        pages?: string[][],
    ) {

        pages?.forEach((page, pageIndex) => {
            const pageText = new Map<number, string>();

            this._pages.set(pageIndex, pageText);
            page.forEach((lineText, lineIndex) => {
                pageText.set(lineIndex, lineText);
            });
        });
    }

    public toString(): string {
        const pages: string[] = [];

        // Sort pages by pageIndex
        const sortedPageIndexes = Array.from(this._pages.keys()).sort((a, b) => a - b);

        for (const pageIndex of sortedPageIndexes) {
            const page = this._pages.get(pageIndex);
            if (!page) {
                continue;
            }

            // Sort lines by lineIndex
            const sortedLineIndexes = Array.from(page.keys()).sort((a, b) => a - b);

            const lines = sortedLineIndexes.map(lineIndex => `  ${lineIndex}: ${page.get(lineIndex)}`);
            pages.push(`Page ${pageIndex}:\n${lines.join('\n')}`);
        }

        return pages.join('\n\n');
    }

    public setLine(index: ITextDocumentIndex, text: string): void {
        const { pageIndex, lineIndex } = index;
        let page = this._pages.get(pageIndex);
        if (!page) {
            page = new Map();
            this._pages.set(pageIndex, page);
        }

        page.set(lineIndex, text);
    }

    public getLine(index: ITextDocumentIndex): string {
        const { pageIndex, lineIndex } = index;
        return this._pages.get(pageIndex)?.get(lineIndex);
    }
}

class TextDocumentIndexObserver extends AbstractObserver<TextDocument, string, ITextDocumentIndex> {
    private readonly _changeSubscription: Subscription;

    constructor(
        owner: IDisposableOwner,
        private readonly _observer: TextDocumentObserver,
        index: ITextDocumentIndex,
    ) {
        super(owner, _observer.target, _observer.target.getLine(index), new ReplaySubject(), index);
        this._changeSubscription = _observer.changed.subscribe(this.onChange);
    }

    protected override disposeInternal(): void {
        this._changeSubscription.unsubscribe();
        this._observer.dispose();
    }

    private readonly onChange = (change: IPropertyChange) => {
        const changeIndex = change.id as ITextDocumentIndex;
        if (changeIndex.lineIndex === this.id.lineIndex && changeIndex.pageIndex === this.id.pageIndex) {
            this.emitChange(change);
        }
    }
}

class TextDocumentObserver extends AbstractObserver<TextDocument> {
    constructor(
        textDocument: TextDocument,
        private readonly _proxyRegister: IProxyRegistry,
        owner?: IDisposableOwner,) {
        super(owner, null, textDocument);

        this.target = new Proxy(textDocument, this);

        // Always register a proxy at the proxy registry
        // so we can determine if an instance is a proxy or not.
        this._proxyRegister.register(textDocument, this.target);
    }

    protected override disposeInternal(): void {
        this._proxyRegister.unregister(this.value);
    }

    public get(
        textDocument: TextDocument,
        property: PropertyKey,
        receiver: unknown
    ): unknown {
        if (property == 'setLine') {
            return (index: ITextDocumentIndex, text: string) => {
                textDocument.setLine(index, text);
                this.emitChange({
                    arguments: [],
                    id: index,
                    target: textDocument,
                    newValue: text,
                });
            };

        } else {
            return Reflect.get(textDocument, property, receiver);
        }
    }
}

function testMonitorTextDocument(stateManager: IStateManager, stateContext: { myBook: TextDocument }): void {
    const bookSubscription = stateManager.changed.subscribe(() => {
        console.log(stateContext.myBook.toString());
    });

    // We observe the whole book
    // This will use TextDocumentObserverProxyPairFactory
    try {
        console.log('\n***********************************************');
        console.log("Start watching the whole book\n");
        console.log('My initial book:\n');
        stateManager.watchState(stateContext, 'myBook', truePredicate);

        console.log('\nUpdate second line on the first page:\n');
        console.log('My book after change:\n');
        stateContext.myBook.setLine({ pageIndex: 0, lineIndex: 1 }, 'In a far far away land');

    } finally {
        // Stop monitoring the whole book
        stateManager.releaseState(stateContext, 'myBook', truePredicate);
        bookSubscription.unsubscribe();
    }
}

function testMonitoreSpecificLineInDocument(stateManager: IStateManager, stateContext: { myBook: TextDocument }): void {
    const line3OnPage1Index = { pageIndex: 0, lineIndex: 2 };
    const lineSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        const documentIndex = change.key as ITextDocumentIndex;
        console.log(`Line ${documentIndex.lineIndex + 1} on page ${documentIndex.pageIndex + 1} has changed to '${change.newValue}'`);
        console.log('My book after change:\n');
        console.log(stateContext.myBook.toString());
    });

    try {
        // Here we only watch line 3 on page 1. 
        // Notice that the line does not have to exist yet.
        // The initial book does not have a line 3 on page 1.
        //
        // TextDocumentInxdexObserverProxyPairFactory is used here

        console.log('\n***********************************************');
        console.log("Start watching line 3 on page 1\n");
        stateManager.watchState(stateContext.myBook, line3OnPage1Index);

        const proxRegistry: IProxyRegistry = InjectionContainer.get(RsXStateManagerInjectionTokens.IProxyRegistry);
        const bookProxy: TextDocument = proxRegistry.getProxy(stateContext.myBook);

        bookProxy.setLine(line3OnPage1Index, 'a prince was born');

        console.log('\nChanging line 1 on page 1 does not emit change:');
        console.log('---');
        bookProxy.setLine({ pageIndex: 0, lineIndex: 0 }, 'a troll was born');

    } finally {
        // Stop monitoring line 3 on page 1. 
        stateManager.releaseState(stateContext.myBook, line3OnPage1Index);
        lineSubscription.unsubscribe();
    }
}

export const run = (() => {
    const stateManager: IStateManager = InjectionContainer.get(
        RsXStateManagerInjectionTokens.IStateManager
    );
    const stateContext = {
        myBook: new TextDocument([
            [
                'Once upon a time',
                'bla bla'
            ],
            [
                'bla bla',
                'They lived happily ever after.',
                'The end'
            ]
        ])
    };
    testMonitorTextDocument(stateManager, stateContext);
    testMonitoreSpecificLineInDocument(stateManager, stateContext);
})();