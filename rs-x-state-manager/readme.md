# rx-x-state-manager

The **State Manager** provides an efficient way to observe and synchronize state changes across your application. State always lives on on a certain context and is identified by and index:

- Object property or field. The index is the property or field name
- Array item. The index is a number refering to the position in an array
- Map item. The index is the belonging map key

State item is defined by two determinants. A context and index but the statemanegr doesn' really know how to resolve an detect changes for the value for it given the context and indes. It uses two service for that:

- A service implementing the interface ```IObjectPropertyObserverProxyPairManager```. This service is responsible for creating a observer for the state and proxified the value if needed

- A service implementing the interface ```IIndexValueAccessor```. This servive is used to get the current value


### Get an instance of the state manager

The statem manage has been register as singleton service and the following example show how to get an instance of it


- Make sure you have loaded the state manager module into the injectioon container

```ts
import { InjectionContainer } from '@rs-x/core';
import { RsXStateManagerModule } from '@rs-x/state-manager';

InjectionContainer.load(RsXStateManagerModule);

```
- Two way to get an instance:
  1. Use the injection container to get an instance
        ```ts
        import { InjectionContainer } from '@rs-x/core';
        import { IIStateManager, RsXStateManagerInjectionTokens } from '@rs-x/state-manager';

        const stateManager: IIStateManager  = InjectionContainer.get(
            RsXStateManagerInjectionTokens.IStateManager
        );
        ```
     
  2. Use the Inject decorator to inject the instance into your class constrructor

        ```ts
        import { Inject } from '@rs-x/core';
        import { IIStateManager, RsXStateManagerInjectionTokens } from '@rs-x/state-manager';

        export class MyClass {

            constructor(
                @Inject(RsXStateManagerInjectionTokens.IStateManager)
                private readonly _stateManager: IIStateManager
            ) {

            }
        }
        ```

### Register state


There are two variants

- Non-recursive: will only monitor the setting the value for the the index
    ```ts
    import { InjectionContainer } from '@rs-x/core';
    import {
        IStateChange,
        IStateManager,
        RsXStateManagerInjectionTokens,
        RsXStateManagerModule
    } from '@rs-x/state-manager';


    InjectionContainer.load(RsXStateManagerModule);

    const stateContext = {
        x: {y: 10}
    };

    const stateManager: IStateManager = InjectionContainer.get(
        RsXStateManagerInjectionTokens.IStateManager
    );

    console.log('Initial value:');
    stateManager.changed.subscribe((change: IStateChange) => {
        console.log(change.newValue);
        console.log('\n');
    });

    // This will emit the new value { y: 10 }
    stateManager.register(stateContext, 'x');


    console.log('Changed value:');
    // This will emit the new value { y: 10 }
    stateContext.x = {
        y:20
    };

    // This will emit no change because the state is not recursive.
    stateContext.x.y = 30
    ```

    ```
    #### Output

    ```console
    Initial value:
    10

    Changed value:
    20
    ```

- Recursive: will monitor both the setting of the value and the change of the value it self. For example if the index value is an object it will monitor changed for the object


    ```ts
import { InjectionContainer, truePredicate } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';


InjectionContainer.load(RsXStateManagerModule);

const stateContext = {
    x: { y: 10 }
};

const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager
);

console.log('Initial value:');
stateManager.changed.subscribe((change: IStateChange) => {
    console.log(structuredClone(change.newValue));
    console.log('\n');
});

// We register recursive state by passing in
// a predicate as the third argument.
// This will emit an initial value { y: 10 }
stateManager.register(stateContext, 'x', truePredicate);


console.log('Changed value:');
// This will emit the new value { y: 10 }
stateContext.x = {
    y: 20
};

console.log('Changed (recursive) value:');
// This will emit the new value { y: 30 } because x 
// is registered as a recursive state.
stateContext.x.y = 30;
    ```

    #### Output

    ```console
    Initial value:
    { y: 10 }

    Changed value:
    { y: 20 }

    Changed (recursive) value:
    { y: 30 }
    ```

- **Registering state is idempotent**, meaning you can register the same state multiple times.
You should never assume a state is already registered—always register it if you depend on it.
Otherwise, the state may unexpectedly disappear when another part of the system unregisters it.

    When you are done, **unregister the state**.


    ```ts
import { InjectionContainer } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';


InjectionContainer.load(RsXStateManagerModule);

const stateContext = {
    x: { y: 10 }
};

const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager
);

stateManager.changed.subscribe((change: IStateChange) => {
    console.log(structuredClone(change.newValue));
    console.log('\n');
});

// Register is idempotent: you can register the same state multiple times.
// For every register call, make sure you call unregister when you're done.
console.log('Initial value:');
stateManager.register(stateContext, 'x');
stateManager.register(stateContext, 'x');

console.log('Changed value:');
stateContext.x = { y: 20 };

stateManager.unregister(stateContext, 'x');

console.log('Changed event is still emitted after unregister because one observer remains.');
console.log('Changed value:');
stateContext.x = { y: 30 };

stateManager.unregister(stateContext, 'x');

console.log('Changed event is no longer emitted after the last observer unregisters.');
console.log('Changed value:');
console.log('-');
stateContext.x = { y: 30 };

    ```

    #### Output

    ```console
    Initial value:
    { y: 10 }

    Changed value:
    { y: 20 }

    Changed event is still emitted after unregister because one observer remains.
    Changed value:
    { y: 30 }
    ```
### Customize the State Manager

The state manager works by creating **observers** based on the **data type of the state you register**. This allows it to detect changes. However, it does **not magically know** how to observe every type. Internally, it uses a list of **observer factories**.  
Each factory can answer whether it supports a given state’s data type.  
The state manager uses **the first factory that reports support** to create the observer.

You can **override this factory list** by providing your own factory provider service.  
Before explaining how to do that, let’s first look at which data types are supported out of the box:

| Context      | Index          | Implementation              |
| ------------ | -------------- | --------------------------- |
| Plain object | field/property | Patching                    |
| Array        | number         | Proxy                       |
| Map          | any            | Proxy                       |
| Set          | Not indexable  | Proxy                       |
| Promise      | Not indexable  | Attach `then` handler       |
| Observable   | Not indexable  | Subscribe to the observable |

As mentioned before, state has two components: **context** and **index**.  
The state manager uses these two values to ask each observer factory whether it supports the state. A factory checks the data type and returns **true** or **false**.

If the factory returns **true**, the state manager uses that factory to create the observer. So the state manager will use **the first observer factory** that returns `true`

Depending on whether the observer is **recursive**, it will do the following:

- For both recursive and non-recursive observers, monitor whether a **new value is assigned** to the index.
- For recursive observers only, also monitor **changes inside the indexed value itself**.

To add support for a custom data type we have do the following:

- create an acccessor to access indexes on your data instance type
- create a factory to create an observer for your data type
- create a factory to create an observer for an  index on your data instance type

The following example shows a example where we create simply class presenting a text document and how we can extends the state manager to support this data type:

```ts
import { IErrorLog, IIndexValueAccessor, IndexAccessor, Inject, Injectable, InjectionContainer, IPropertyChange, RsXCoreInjectionTokens, SingletonFactory, truePredicate, WaitForEvent } from '@rs-x/core';
import {
    AbstractObserver,
    IDisposableOwner,
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
    MustProxify,
    ObjectObserverFactory,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';
import { ReplaySubject, Subscription } from 'rxjs';

//Load the state manager module in the injection container
InjectionContainer.load(RsXStateManagerModule);

class IndexForTextDocumentxObserverManager
    extends SingletonFactory<
        number| MustProxify,
        IIndexObserverInfo<ITextDocumentIndex>,
        TextDocumentIndexObserver> {

    constructor(
        private readonly _textDocument: TextDocument,
        private readonly _textDocumentObserverManager: TextDocumentObserverManager,
        private readonly releaseOwner: () => void
    ) {
        super();
    }


    public override getId(indexObserverInfo:  IIndexObserverInfo<ITextDocumentIndex>): number| MustProxify {
        return this.createId(indexObserverInfo);
    }

    protected override createInstance(indexObserverInfo: IIndexObserverInfo<ITextDocumentIndex>, id: number | MustProxify): TextDocumentIndexObserver {
        const textDocumentObsever = this._textDocumentObserverManager.create(this._textDocument).instance;
        return new TextDocumentIndexObserver(
            {
                canDispose: () => this.getReferenceCount(id) === 1,
                release: () => {
                    textDocumentObsever.dispose();
                    this.release(id);
                },
            },
            textDocumentObsever, indexObserverInfo.index
        );
    }

    protected override createId(indexObserverInfo:  IIndexObserverInfo<ITextDocumentIndex>): number| MustProxify  {

        if(indexObserverInfo.mustProxify) {
            return indexObserverInfo.mustProxify
        }
        // using cantor pair to create unique idn form page and line index
        const { pageIndex, lineIndex } = indexObserverInfo.index;
        return ((pageIndex + lineIndex) * (pageIndex + lineIndex + 1)) / 2 + lineIndex;
    }

    protected override onReleased(): void {
        if(this.isEmpty) {
            this.releaseOwner();
        }
    }
}

// We want to be sure that for the same text doucment we always have the same observer
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

// We want to be sure we create only one observer per text document index
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

        return new IndexForTextDocumentxObserverManager(textDocument, this._textDocumentObserverManager, () => this.release(textDocument))

    }

    protected override releaseInstance(
        indexForTextDocumentxObserverManager: IndexForTextDocumentxObserverManager
    ): void {
        indexForTextDocumentxObserverManager.dispose();
    }
}

// Normally we would create or own module
// But for simplicity we bind or service directly to the injection container 

InjectionContainer.bind(TextDocumentObserverManager).to(TextDocumentObserverManager).inSingletonScope();
InjectionContainer.bind(TextDocumenIndexObserverManager).to(TextDocumenIndexObserverManager).inSingletonScope();


@IndexAccessor()
export class TextDocumentIndexAccessor implements IIndexValueAccessor<TextDocument, ITextDocumentIndex> {
    //Indicate wheter the value is async. For example when the value is a promise
    public isAsync(_context: TextDocument, _index: ITextDocumentIndex): boolean {
        return false
    }

    // Here it is the same as get value.
    // But for example for a Promise accessor the getValue returns the promise
    // and getResolvedValue returns the promise value
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
        return context instanceof TextDocument
    }
}

@IndexObserverFactory()
export class TextDocumentInxdexObserverProxyPairFactory extends IndexObserverProxyPairFactory<TextDocument, unknown> {
    constructor(
        @Inject(RsXStateManagerInjectionTokens.IObjectObserverProxyPairManager)
        objectObserveryManager: IObjectObserverProxyPairManager,
        @Inject(TextDocumenIndexObserverManager)
        textDocumenIndexObserverManager:TextDocumenIndexObserverManager,
        @Inject(RsXCoreInjectionTokens.IErrorLog)
        errorLog: IErrorLog,
        @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
        indexValueAccessor: IIndexValueAccessor
    ) {
        super(
            objectObserveryManager,
            textDocumenIndexObserverManager,
            errorLog,
            indexValueAccessor
        );
    }

    public applies(object: unknown, propertyInfo: IPropertyInfo): boolean {
        const documentKey = propertyInfo.key as ITextDocumentIndex;
        return object instanceof TextDocument && documentKey?.lineIndex >= 0 && documentKey?.pageIndex >= 0
    }
}

@ObjectObserverFactory()
export class TextDocumentObserverProxyPairFactory implements IObjectObserverProxyPairFactory {
    constructor(
        @Inject(TextDocumentObserverManager)
        private readonly _textDocumentObserverManager: TextDocumentObserverManager) { }

    public create(
        _: IDisposableOwner,
        proxyTarget: IProxyTarget<TextDocument>): IObserverProxyPair<TextDocument, TextDocument> {

        const observer = this._textDocumentObserverManager.create(proxyTarget.target).instance;
        return {
            observer,
            proxy: observer.target as TextDocument,
            proxyTarget: proxyTarget.target,
            id: proxyTarget.target,
            // this should normally only be set to false when value
            // is async. For example when property is a Promise
            emitChangeWhenSet: true
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
    private readonly _pages = new Map<number, Map<number, string>>()
    constructor(
        pages?: string[][],
    ) {

        pages?.forEach((page, pageIndex) => {
            const pageText = new Map<number, string>();

            this._pages.set(pageIndex, pageText);
            page.forEach((lineText, lineIndex) => {
                pageText.set(lineIndex, lineText)
            })
        })
    }

    public toString(): string {
        const pages: string[] = [];

        // Sort pages by pageIndex
        const sortedPageIndexes = Array.from(this._pages.keys()).sort((a, b) => a - b);

        for (const pageIndex of sortedPageIndexes) {
            const page = this._pages.get(pageIndex);
            if (!page) continue;

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
            this._pages.set(pageIndex, page)
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
            this.emitChange(change)
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

        // Always register a proxy at the proxy register
        // in order we can determine if an instance is proxy or not.
        this._proxyRegister.register(textDocument, this.target);
    }


    protected override disposeInternal(): void {
        this._proxyRegister.unregister(this.initialValue);
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




const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager
);

const bookSubscription = stateManager.changed.subscribe((change: IStateChange) => {
    console.log('My book after change:');
    console.log(stateContext.myBook.toString());

    console.log(`index ${change.key}`);

});


//We observer the whole book
//
//This will use TextDocumentObserverProxyPairFactory
try {

    console.log('***********************************************');
    console.log('My intial book:');
    stateManager.register(stateContext, 'myBook', truePredicate);

    console.log('Update second line on the first page:')
    stateContext.myBook.setLine({ pageIndex: 0, lineIndex: 1 }, 'In a far far away land');

} finally {
    //Stop monitoring the whole book
    stateManager.unregister(stateContext, 'myBook', truePredicate);
    bookSubscription.unsubscribe();
}

const line3OnPage1Index = { pageIndex: 0, lineIndex: 2 };
const lineSubscription = stateManager.changed.subscribe((change: IStateChange) => {
    const documentIndex = change.key as ITextDocumentIndex;
    console.log(`Line ${documentIndex.lineIndex + 1} on page  ${documentIndex.pageIndex + 1} has changed to '${change.newValue}'`);
    console.log('\n');
    console.log('My book after change:');
    console.log(stateContext.myBook.toString());
    console.log('\n');
});

try {
    // Here we only watch line 3 on page 1. 
    // Notice that the line does not have to exist yet
    // The initial book does nat have a line 3 yet on page 1
    //
    // TextDocumentInxdexObserverProxyPairFactory is used here

    console.log('***********************************************');
    console.log("Start watching line 3 on page 1")
    stateManager.register(stateContext.myBook, line3OnPage1Index);

    const proxRegistry: IProxyRegistry = InjectionContainer.get(RsXStateManagerInjectionTokens.IProxyRegistry);
    const bookProxy: TextDocument = proxRegistry.getProxy(stateContext.myBook);

    console.log("Add line 3 on page 1:")
    bookProxy.setLine(line3OnPage1Index, 'a prince was born');


    console.log('Changing line 1 on page 1 does not emit change:');
    const result = await new WaitForEvent(stateManager, 'changed').wait(() => {
          bookProxy.setLine({ pageIndex: 0, lineIndex: 0 }, 'a troll was born');
    });

    console.log(result ? 'No change was emiiited': 'Oops unexpected change was emitted');


} finally {
    //Stop monitoring line 3 on page 1. 
    stateManager.unregister(stateContext.myBook, line3OnPage1Index);
    lineSubscription.unsubscribe();
}

```