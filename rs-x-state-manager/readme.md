# State-manager

The **State Manager** provides an efficient way to observe and synchronize state changes across your application.  
State always lives on a certain **context** and is identified by an **index**:

- Object property or field → index = property/field name  
- Array item → index = numeric position  
- Map item → index = the map key  

A state item is always determined by **(context, index)**.  
The state manager does **not** automatically know how to detect changes for every data type, so it uses two services:

- A service implementing `IObjectPropertyObserverProxyPairManager`  
  Responsible for creating an observer and proxying values if needed.

- A service implementing `IIndexValueAccessor`  
  Responsible for retrieving the current value.


The **State Manager** has the followng interface:
```ts
export interface IStateManager {
    readonly changed: Observable<IStateChange>;
    readonly contextChanged: Observable<IContextChanged>;
    readonly startChangeCycly: Observable<void>;
    readonly endChangeCycly: Observable<void>;

    isRegistered(
        context: unknown,
        index: unknown,
        mustProxify?: MustProxify
    ): boolean;

    register(
        context: unknown,
        index: unknown,
        mustProxify?: MustProxify
    ): unknown;

    unregister(
        context: unknown,
        index: unknown,
        mustProxify?: MustProxify
    ): void;

    getState(
        context: unknown,
        index: unknown
    ): unknown;

    clear(): void;
}
```

---

## Members

### **changed**
**Type:** `Observable<IStateChange>`  
Emits whenever a state value changes.

---

### **contextChanged**
**Type:** `Observable<IContextChanged>`  
Emits whenever an entire context is replaced. Happes for example when you replaces a nested object.

---

### **startChangeCycly**
**Type:** `Observable<void>`  
Emits at the start of handling a state change.

---

### **endChangeCycly**
**Type:** `Observable<void>`  
Emits at the end of handling a state change.

---

### **isRegistered(context, index, mustProxify?)**
Returns whether the given `(context, index)` pair is already registered.

| Parameter       | Type                       | Description                                               |
| --------------- | -------------------------- | --------------------------------------------------------- |
| **context**     | `unknown`                  | The object holding the property or promise being tracked. |
| **index**       | `unknown`                  | The index identifying the state on the passed in.         |
| **mustProxify** | `MustProxify` *(optional)* | Controls whether the value should be proxified.           |

**Returns:** `boolean`

---

### **register(context, index, mustProxify?)**
Registers a `(context, index)` pair so its value is proxified and tracked.

| Parameter       | Type                       | Description                                                 |
| --------------- | -------------------------- | ----------------------------------------------------------- |
| **context**     | `unknown`                  | The state context.                                          |
| **index**       | `unknown`                  | The index identifying the state on the passed in.           |
| **mustProxify** | `MustProxify` *(optional)* | Predicate to determine whether the value must be proxified. |

**Returns:** `unknown` (the proxified value)

---

### **unregister(context, index, mustProxify?)**
Unregisters a previously registered state field.

| Parameter       | Type                       | Description                                          |
| --------------- | -------------------------- | ---------------------------------------------------- |
| **context**     | `unknown`                  | The state context.                                   |
| **index**       | `unknown`                  | The index identifying the state on the passed in.    |
| **mustProxify** | `MustProxify` *(optional)* | Reference to the predicate passed into `register()`. |

**Returns:** `void`

---

### **getState(context, index)**
Retrieves the currently tracked value for `(context, index)`.

| Parameter   | Type      | Description                                                |
| ----------- | --------- | ---------------------------------------------------------- |
| **context** | `unknown` | The state context.                                         |
| **index**   | `unknown` | The index identifying the state on the passed in context . |

**Returns:** `unknown`

---

### **clear()**
Clears all registered state values.

**Returns:** `void`

---

## Get an instance of the State Manager

The state manager is registered as a **singleton service**.  
You must load the module into your injection container.

```ts
import { InjectionContainer } from '@rs-x/core';
import { RsXStateManagerModule } from '@rs-x/state-manager';

InjectionContainer.load(RsXStateManagerModule);
```

There are two ways to get an instance:

### 1. Using the injection container

```ts
import { InjectionContainer } from '@rs-x/core';
import { IIStateManager, RsXStateManagerInjectionTokens } from '@rs-x/state-manager';

const stateManager: IIStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager
);
```

### 2. Using the `@Inject` decorator

```ts
import { Inject } from '@rs-x/core';
import { IIStateManager, RsXStateManagerInjectionTokens } from '@rs-x/state-manager';

export class MyClass {

    constructor(
        @Inject(RsXStateManagerInjectionTokens.IStateManager)
        private readonly _stateManager: IIStateManager
    ) {}
}
```

---

## Register state

There are two variants:

### Non-recursive  
Monitors only assignment of a **new value** to the index.

```ts
import { InjectionContainer } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';


InjectionContainer.load(RsXStateManagerModule);

const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager
);

function printValue(object: unknown): void {
    console.log(JSON.stringify(object, null, 4).replaceAll('"', ''));
}

const stateContext = {
    x: { y: 10 }
};


console.log('Initial value:');
stateManager.changed.subscribe((change: IStateChange) => {
    printValue(change.newValue);
});

// This will emit the new value { y: 10 }
stateManager.register(stateContext, 'x');


console.log('Changed value:');
// This will emit the new value { y: 10 }
stateContext.x = {
    y: 20
};

console.log(`Latest value:`);
printValue(stateManager.getState(stateContext, 'x'));

// This will emit no change because the state is not recursive.
console.log('\nstateContext.x.y = 30 will not emit any change:\n---\n');
stateContext.x.y = 30;

```

**Output:**

```console
Initial value:
10

Changed value:
20
```

---

### Recursive  
Monitors assignments **and** changes *inside* the value.  
Example: if the value is an object, internal object changes are also observed.

```ts
import { InjectionContainer, truePredicate } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';


InjectionContainer.load(RsXStateManagerModule);


const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager
);

function printValue(object: unknown): void {
    console.log(JSON.stringify(object, null, 4).replaceAll('"', ''));
}

const stateContext = {
    x: { y: 10 }
};


console.log('Initial value:');
stateManager.changed.subscribe((change: IStateChange) => {
    printValue(change.newValue)
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

console.log(`Latest value:`);
printValue(stateManager.getState(stateContext, 'x'));
```

**Output:**

```console
Initial value:
{ y: 10 }

Changed value:
{ y: 20 }

Changed (recursive) value:
{ y: 30 }
```

---

### State registration is idempotent

You can register the same state multiple times.  
Never assume a state is already registered—always register if you depend on it.  
Otherwise the state may disappear when another part of the system unregisters it.

When done, unregister the state:

```ts
import { InjectionContainer } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';


// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager
);

function printValue(object: unknown): void {
    console.log(JSON.stringify(object, null, 4).replaceAll('"', ''));
}

const stateContext = {
    x: { y: 10 }
};

stateManager.changed.subscribe((change: IStateChange) => {
   printValue(change.newValue);
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
console.log('---');
stateContext.x = { y: 30 };
```

**Output:**

```console
Initial value:
{ y: 10 }

Changed value:
{ y: 20 }

Changed event is still emitted after unregister because one observer remains.
Changed value:
{ y: 30 }
```

---

## Support data types

The state manager works by creating **observers** based on the data type of the registered state.  
It uses a chain of **observer factories**, each capable of determining whether it supports a particular type.  
The **first factory** that returns `true` is used.

You can override this factory list by providing your own custom provider service.

### Built-in supported types

| Type        | Index          | Implementation         | example                          |
| ----------- | -------------- | ---------------------- | -------------------------------- |
| Object      | field/property | Patching               | [example](#object-propertyfield) |
| Array       | number         | Proxy                  | [example](#array)                |
| Map         | any            | Proxy                  | [example](#map)                  |
| Set         | Not indexable  | Proxy                  | [example](#set)                  |  |
| Promise     | Not indexable  | Attach `.then` handler | [example](#promise)              |
| Observable  | Not indexable  | Subscribe              | [example](#observable)           |
| Custom type | user defined   | user defined           | [example](#customtype)           |

State consists of **context** and **index**.  
The manager checks each observer factory to determine support based on these two values.

Behavior:

- Both recursive and non-recursive observers monitor **assignment** of a new value.
- Recursive observers additionally monitor **internal changes** of the value.

The following example illustrates the different state types:

### Object property/field
**Example**
```ts
import { InjectionContainer, truePredicate } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager
);

function printValue(object: unknown): void {
    console.log(JSON.stringify(object, null, 4).replaceAll('"', ''));
}

interface INestStateConext {
    a: number;
    nested?: INestStateConext;
}

class StateContext {
    private _b: INestStateConext = {
        a: 10,
        nested: {
            a: 20,
            nested: {
                a: 30,
                nested: {
                    a: 40
                }
            }
        }
    };

    public get b(): INestStateConext {
        return this._b;
    }

    public set b(value: INestStateConext) {
        this._b = value;
    }
}

const stateContext = new StateContext();

const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
    printValue(change.newValue);
});

try {
    // Observe property `b` recursively.
    // Otherwise, only assigning a new value to stateContext.b would emit a change event.
    // This will emit a change event with the initial (current) value.
    console.log('Initial value:');
    stateManager.register(stateContext, 'b', truePredicate);

    console.log('\nReplacing stateContext.b.nested.nested will emit a change event');
    console.log('Changed value:');

    stateContext.b.nested.nested = {
        a: -30,
        nested: {
            a: -40
        }
    };

     console.log(`Latest value:`);
     printValue(stateManager.getState(stateContext, 'b'));

} finally {
    changeSubscription.unsubscribe();
    stateManager.unregister(stateContext, 'b', truePredicate);
}
```
**Output:**
```console
Running demo: /Users/robertsanders/projects/rs-x/demo/src/rs-x-state-manager/register-property.ts
Initial value:
{
    a: 10,
    nested: {
        a: 20,
        nested: {
            a: 30,
            nested: {
                a: 40
            }
        }
    }
}

Replacing stateContext.b.nested.nested will emit a change event
Changed value:
{
    a: 10,
    nested: {
        a: 20,
        nested: {
            a: -30,
            nested: {
                a: -40
            }
        }
    }
}
Latest value:
{
    a: 10,
    nested: {
        a: 20,
        nested: {
            a: -30,
            nested: {
                a: -40
            }
        }
    }
}
```

### Array
**Example**
```ts
import { InjectionContainer, truePredicate, WaitForEvent } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager
);

function printValue(object: unknown): void {
    console.log(JSON.stringify(object, null, 4).replaceAll('"', ''));
}

const stateContext = {
    array: [
        [1, 2],
        [3, 4]
    ]
};

const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
    printValue(change.newValue);
});

try {
    // Otherwise, only assigning a new value to stateContext.array would emit a change event.
    // This will emit a change event with the initial (current) value.
    console.log('Initial value:');

    stateManager.register(stateContext, 'array', truePredicate);

    console.log('Changed value:');
    stateContext.array[1].push(5);

    console.log('Latest value:');
    printValue(stateManager.getState(stateContext,'array'));

} finally {
    changeSubscription.unsubscribe();
    stateManager.unregister(stateContext, 'array', truePredicate);
}
```
**Output:**
```console
Running demo: /Users/robertsanders/projects/rs-x/demo/src/rs-x-state-manager/register-array.ts
Initial value:
[
    [
        1,
        2
    ],
    [
        3,
        4
    ]
]
Changed value:
[
    [
        1,
        2
    ],
    [
        3,
        4,
        5
    ]
]
Latest value:
[
    [
        1,
        2
    ],
    [
        3,
        4,
        5
    ]
]
```

### Map
**Example**
```ts
import { InjectionContainer, truePredicate, WaitForEvent } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager
);

function printMap(map: Map<string, number[]>): void {
    console.log(JSON.stringify(Array.from(map.entries()), null, 4).replaceAll('"', ''));
}

const stateContext = {
    map: new Map([
        ['a', [1, 2]],
        ['b', [3, 4]]
    ])
};

const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
    printMap(change.newValue as Map<string, number[]>);
});

try {
    // Otherwise, only assigning a new value to stateContext.map would emit a change event.
    // This will emit a change event with the initial (current) value.
    console.log('Initial value:');

    stateManager.register(stateContext, 'map', truePredicate);

    console.log('Changed value:');
    stateContext.map.get('b').push(5);

    console.log('Latest value:');
    printMap(stateManager.getState(stateContext,'map') as Map<string, number[]>);

} finally {
    changeSubscription.unsubscribe();
    stateManager.unregister(stateContext, 'array', truePredicate);
}
```
**Output:**
```console
Running demo: /Users/robertsanders/projects/rs-x/demo/src/rs-x-state-manager/register-map.ts
Initial value:
[
    [
        a,
        [
            1,
            2
        ]
    ],
    [
        b,
        [
            3,
            4
        ]
    ]
]
Changed value:
[
    [
        a,
        [
            1,
            2
        ]
    ],
    [
        b,
        [
            3,
            4,
            5
        ]
    ]
]
Latest value:
[
    [
        a,
        [
            1,
            2
        ]
    ],
    [
        b,
        [
            3,
            4,
            5
        ]
    ]
]
```

### Set
**Example**
```ts
import { InjectionContainer, truePredicate, WaitForEvent } from '@rs-x/core';
import {
    IProxyRegistry,
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager
);

function printSet(set: Set<number[]>): void {
    console.log(JSON.stringify(Array.from(set.values()), null, 4).replaceAll('"', ''));
}

const item1 = [1, 2];
const item2 = [3, 4];
const stateContext = {
    set: new Set([item1, item2])
};

const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
    printSet(change.newValue as Set<number[]>);
});

try {
    // Otherwise, only assigning a new value to stateContext.map would emit a change event.
    // This will emit a change event with the initial (current) value.
    console.log('Initial value:');

    stateManager.register(stateContext, 'set', truePredicate);

    console.log('Changed value:');

    const proxyRegister: IProxyRegistry = InjectionContainer.get(RsXStateManagerInjectionTokens.IProxyRegistry);
    proxyRegister.getProxy<number[]>(item2).push(5);


    console.log('Latest value:');
    printSet(stateManager.getState(stateContext,'set') as Set<number[]>);

} finally {
    changeSubscription.unsubscribe();
    stateManager.unregister(stateContext, 'array', truePredicate);
}
```
**Output:**
```console
Running demo: /Users/robertsanders/projects/rs-x/demo/src/rs-x-state-manager/register-set.ts
Initial value:
[
    [
        1,
        2
    ],
    [
        3,
        4
    ]
]
Changed value:
[
    [
        1,
        2
    ],
    [
        3,
        4,
        5
    ]
]
Latest value:
[
    [
        1,
        2
    ],
    [
        3,
        4,
        5
    ]
]
```

### Promise
**Example**
```ts
import { InjectionContainer, truePredicate, WaitForEvent } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager
);

const stateContext = {
    promise: Promise.resolve(10)
};

export const run = (async () => {
    const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        console.log(change.newValue);
    });

    try {
        console.log('Initial value:');

        await new WaitForEvent(stateManager, 'changed').wait(() => {
            stateManager.register(stateContext, 'promise');
        });

        console.log('Changed value:');


        await new WaitForEvent(stateManager, 'changed').wait(() => {
            let resolveHandler: (value: number) => void;
            stateContext.promise = new Promise((resolve) => { resolveHandler = resolve; });
            resolveHandler(30);
        });

        console.log(`Latest value: ${stateManager.getState(stateContext, 'promise')}`);
    } finally {
        changeSubscription.unsubscribe();
        stateManager.unregister(stateContext, 'promise');
    }
})();
```
**Output:**
```console
Running demo: /Users/robertsanders/projects/rs-x/demo/src/rs-x-state-manager/register-promise.ts
Initial value:
10
Changed value:
30
Latest value: 30
```

### Observable
**Example**
```ts
import { InjectionContainer, truePredicate, WaitForEvent } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';
import { of, Subject } from 'rxjs';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager
);

const stateContext = {
    observable: of(10)
};

export const run = (async () => {
    const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        console.log(change.newValue);
    });

    try {
        // Observe the observable.
        // Will emit a change event with the initial value.
        console.log('Initial value:');

        // We need to wait here until the event is emitted,
        // otherwise the demo will exit before the change event occurs.
        await new WaitForEvent(stateManager, 'changed').wait(() => {
            stateManager.register(stateContext, 'observable');
        });

        console.log('Changed value:');

        await new WaitForEvent(stateManager, 'changed').wait(() => {
            const subject = new Subject<number>();
            stateContext.observable = subject
            subject.next(30);
        });


        console.log(`Latest value: ${stateManager.getState(stateContext, 'observable')}`);

    } finally {
        changeSubscription.unsubscribe();
        stateManager.unregister(stateContext, 'observable');
    }
})();
```
**Output:**
```console
Running demo: /Users/robertsanders/projects/rs-x/demo/src/rs-x-state-manager/register-observable.ts
Initial value:
10
Changed value:
30
Latest value: 30
```

### Custom type
1. Create an accessor to retrieve index values on your type.  
2. Create a factory to create an observer for your data type.  
3. Create a factory to create an observer for an index on your data instance.

The following example demonstrates adding support for a custom `TextDocument` class:

**Example**
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

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

class IndexForTextDocumentxObserverManager
    extends SingletonFactory<
        number | MustProxify,
        IIndexObserverInfo<ITextDocumentIndex>,
        TextDocumentIndexObserver> {

    constructor(
        private readonly _textDocument: TextDocument,
        private readonly _textDocumentObserverManager: TextDocumentObserverManager,
        private readonly releaseOwner: () => void
    ) {
        super();
    }


    public override getId(indexObserverInfo: IIndexObserverInfo<ITextDocumentIndex>): number | MustProxify {
        return this.createId(indexObserverInfo);
    }

    protected override createInstance(indexObserverInfo: IIndexObserverInfo<ITextDocumentIndex>, id: number | MustProxify): TextDocumentIndexObserver {
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

    protected override createId(indexObserverInfo: IIndexObserverInfo<ITextDocumentIndex>): number | MustProxify {

        if (indexObserverInfo.mustProxify) {
            return indexObserverInfo.mustProxify;
        }
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
        indexValueAccessor: IIndexValueAccessor
    ) {
        super(
            objectObserverManager,
            textDocumenIndexObserverManager,
            errorLog,
            indexValueAccessor
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
        proxyTarget: IProxyTarget<TextDocument>): IObserverProxyPair<TextDocument, TextDocument> {

        const observer = this._textDocumentObserverManager.create(proxyTarget.target).instance;
        return {
            observer,
            proxy: observer.target as TextDocument,
            proxyTarget: proxyTarget.target,
            id: proxyTarget.target,
            // This should normally only be set to false when the value
            // is async. For example when the property is a Promise
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

// Load the state manager module into the injection container
const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager
);

function testMonitorTextDocument(): void {
    const bookSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        console.log(stateContext.myBook.toString());

    });

    // We observe the whole book
    // This will use TextDocumentObserverProxyPairFactory
    try {
        console.log('\n***********************************************');
        console.log("Start watching the whole book\n");
        console.log('My initial book:\n');
        stateManager.register(stateContext, 'myBook', truePredicate);

        console.log('\nUpdate second line on the first page:\n');
        console.log('My book after change:\n');
        stateContext.myBook.setLine({ pageIndex: 0, lineIndex: 1 }, 'In a far far away land');

    } finally {
        // Stop monitoring the whole book
        stateManager.unregister(stateContext, 'myBook', truePredicate);
        bookSubscription.unsubscribe();
    }

}

function testMonitoreSpecificLineInDocument():void {
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
        stateManager.register(stateContext.myBook, line3OnPage1Index);

        const proxRegistry: IProxyRegistry = InjectionContainer.get(RsXStateManagerInjectionTokens.IProxyRegistry);
        const bookProxy: TextDocument = proxRegistry.getProxy(stateContext.myBook);

        bookProxy.setLine(line3OnPage1Index, 'a prince was born');

        console.log('\nChanging line 1 on page 1 does not emit change:');
        console.log('---');
        bookProxy.setLine({ pageIndex: 0, lineIndex: 0 }, 'a troll was born');

    } finally {
        // Stop monitoring line 3 on page 1. 
        stateManager.unregister(stateContext.myBook, line3OnPage1Index);
        lineSubscription.unsubscribe();
    }
}

testMonitorTextDocument();
testMonitoreSpecificLineInDocument();
```nclude_relative ../demo/src/rs-x-state-manager/register-set.ts %}
```
**Output:**
```console
Running demo: /Users/robertsanders/projects/rs-x/demo/src/rs-x-state-manager/state-manager-customize.ts

***********************************************
Start watching the whole book

My initial book:

Page 0:
    0: Once upon a time
    1: bla bla

Page 1:
    0: bla bla
    1: They lived happily ever after.
    2: The end

Update second line on the first page:

My book after change:

Page 0:
    0: Once upon a time
    1: In a far far away land

Page 1:
    0: bla bla
    1: They lived happily ever after.
    2: The end

***********************************************
Start watching line 3 on page 1

Line 3 on page 1 has changed to 'a prince was born'
My book after change:

Page 0:
    0: Once upon a time
    1: In a far far away land
    2: a prince was born

Page 1:
    0: bla bla
    1: They lived happily ever after.
    2: The end

Changing line 1 on page 1 does not emit change:
---
```

