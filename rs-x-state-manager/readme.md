# State-manager

The **State Manager** provides an efficient way to observe and synchronize state changes across your application.

A state item is defined by a **context** and an **index**.  
A context can be an object, and an index can be a property name — but it is not limited to that. It can be **any value**. The context is used as an identifier to group a set of state indexes.

Examples of state indexes:

- Object property or field → index = property or field name  
- Array item → index = numeric position  
- Map item → index = map key  

The State Manager does **not** automatically know how to detect changes for every state value data type, nor how to patch the corresponding state setter. Therefore, it relies on two services:

- A service implementing `IObjectPropertyObserverProxyPairManager`  
  Responsible for creating observers and proxying values when needed.

- A service implementing `IIndexValueAccessor`  
  Responsible for retrieving the current value.


The **State Manager** has the followng interface:
```ts
export interface IStateManager {
    readonly changed: Observable<IStateChange>;
    readonly contextChanged: Observable<IContextChanged>;
    readonly startChangeCycle: Observable<void>;
    readonly endChangeCycle: Observable<void>;

    isWatched(
        context: unknown,
        index: unknown,
        mustProxify: MustProxify
    ): boolean;

    watchState(
        context: unknown, 
        index: unknown, 
        mustProxify?: MustProxify
    ): unknown;

    releaseState(
        oontext: unknown, 
        index: unknown, 
        mustProxify?: MustProxify
    ): void;

    getState<T>(
        context: unknown, 
        index: unknown
    ): T;

    setState<T>(
        context: unknown, 
        index: unknown, 
        value: T
    ): void;

    clear(): void;
}
```

---

## Members

### **changed**
**Type:** `Observable<IStateChange>`  
Emits whenever a state item value changes.

---

### **contextChanged**
**Type:** `Observable<IContextChanged>`  
Emits whenever an entire context is replaced.  
This happens, for example, when a nested object is replaced.

---

### **startChangeCycle**
**Type:** `Observable<void>`  
Emits at the start of processing a state item change.

---

### **endChangeCycle**
**Type:** `Observable<void>`  
Emits at the end of processing a state item change.

---

### **isWatched(context, index, mustProxify)**
Returns whether the state item identified by the `(context, index, mustProxify)` triplet is currently being watched.

| Parameter       | Type                       | Description                                                     |
| --------------- | -------------------------- | --------------------------------------------------------------- |
| **context**     | `unknown`                  | The context to which the state index belongs.                   |
| **index**       | `unknown`                  | The index identifying the state on the given context.           |
| **mustProxify** | `MustProxify` *(optional)* | Predicate determining whether a nested state value must be proxified. It should be the same predicate that was passed to `watchState`.               |

**Returns:** `boolean`

---

### **watchState(context, index, mustProxify?)**
Watches a state item identified by the `(context, index, mustProxify)` triplet so that its value is proxified and tracked.

| Parameter       | Type                       | Description                                                     |
| --------------- | -------------------------- | --------------------------------------------------------------- |
| **context**     | `unknown`                  | The state context.                                              |
| **index**       | `unknown`                  | The index identifying the state on the given context.           |
| **mustProxify** | `MustProxify` *(optional)* | Predicate determining whether a nested state value must be proxified.|

**Returns:**  
`unknown` — the state item value if it was already being watched; otherwise `undefined`.

---

### **releaseState(context, index, mustProxify?)**
Releases the state item identified by the `(context, index, mustProxify)` triplet.  
Each call to `watchState` should have a corresponding `releaseState` call to ensure the state item is released when it is no longer needed.

| Parameter       | Type                       | Description                                                     |
| --------------- | -------------------------- | --------------------------------------------------------------- |
| **context**     | `unknown`                  | The state context.                                              |
| **index**       | `unknown`                  | The index identifying the state on the given context.           |
| **mustProxify** | `MustProxify` *(optional)* | Predicate determining whether a nested state value must be proxified. It should be the same predicate that was passed to `watchState`. .              |

**Returns:** `void`

---

### **getState(context, index)**
Retrieves the current state item value identified by the `(context, index)` pair.

| Parameter   | Type      | Description                                                     |
| ----------- | --------- | --------------------------------------------------------------- |
| **context** | `unknown` | The state context.                                              |
| **index**   | `unknown` | The index identifying the state on the given context.           |

**Returns:** `unknown`

---

### **setState(context, index, value)**
Sets the value of the state item identified by the `(context, index)` pair.

Unlike `watchState`, `setState` does **not** track changes. It does not patch setters or proxify values.  
A change event is emitted on the first `setState` call and again whenever the value changes in subsequent calls.

| Parameter   | Type      | Description                                                     |
| ----------- | --------- | --------------------------------------------------------------- |
| **context** | `unknown` | The state context.                                              |
| **index**   | `unknown` | The index identifying the state on the given context.           |
| **value**   | `unknown` | The state value.                                                |

---

### **clear()**
Releases all registered state items.

**Returns:** `void`

---

## Get an instance of the State Manager

The state manager is registered as a **singleton service**.  
You must load the module into the injection container if you went
to use it.

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
import { InjectionContainer, printValue } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

export const run = (() => {
    const stateManager: IStateManager = InjectionContainer.get(
        RsXStateManagerInjectionTokens.IStateManager
    );

    const stateContext = {
        x: { y: 10 }
    };

    // This will emit a change event with the initial (current) value.
    console.log('Initial value:');
    const changedSubsription = stateManager.changed.subscribe((change: IStateChange) => {
        printValue(change.newValue);
    });

    try {
        // This will emit the new value { y: 10 }
        stateManager.watchState(stateContext, 'x');

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

    } finally {
        changedSubsription.unsubscribe();
        // Always release the state when it is no longer needed.
        stateManager.releaseState(stateContext, 'x');
    }
})();

```

**Output:**

```console
Running demo: demo/src/rs-x-state-manager/register-non-recursive-state.ts
Initial value:
{
    y: 10
}
Changed value:
{
    y: 20
}
Latest value:
{
    y: 20
}

stateContext.x.y = 30 will not emit any change:
---
```

---

### Recursive  
Monitors assignments **and** changes *inside* the value.  
Example: if the value is an object, internal object changes are also observed. You can make a state item recursive by passing in a **mustProxify** predicate to a **watchState** call. The mustProxify will be called for every nested index. If you return true it will watch the index otherwise not.

```ts
import { InjectionContainer, printValue, truePredicate } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

export const run = (() => {
    const stateManager: IStateManager = InjectionContainer.get(
        RsXStateManagerInjectionTokens.IStateManager
    );
    const stateContext = {
        x: { y: 10 }
    };
    const changedSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        printValue(change.newValue)
    });

    try {
        // We register recursive state by passing
        // a predicate as the third argument.
        // In this case, we want to watch the entire value,
        // so we pass a predicate that always returns true.
        // This will emit an initial value { y: 10 }
        console.log('Initial value:');
        stateManager.watchState(stateContext, 'x', truePredicate);

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

    } finally {
        changedSubscription.unsubscribe();
         // Always release the state when it is no longer needed.
        stateManager.releaseState(stateContext, 'x', truePredicate);
    }
})();
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

### Manually setting state

Besides that you can register a watched stated (calling `watchedState`) you can register an unwatched state using `setState`. An example for using `setState` might be an readonly property:

```ts
import { InjectionContainer, printValue } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

export const run = (() => {
    const stateManager: IStateManager = InjectionContainer.get(
        RsXStateManagerInjectionTokens.IStateManager
    );

    class StateContext {
        private readonly _aPlusBId = 'a+b';
        private _a = 10;
        private _b = 20;

        constructor() {
            this.setAPlusB();
        }

        public dispose(): void {
            return stateManager.releaseState(this, this._aPlusBId);
        }

        public get aPlusB(): number {
            return stateManager.getState(this, this._aPlusBId);
        }

        public get a(): number {
            return this._a;
        }

        public set a(value: number) {
            this._a = value;
            this.setAPlusB();
        }

        public get b(): number {
            return this._b;
        }

        public set b(value: number) {
            this._b = value;
            this.setAPlusB();
        }

        private setAPlusB(): void {
            stateManager.setState(this, this._aPlusBId, this._a + this._b)
        }
    }

    const stateContext = new StateContext();
    const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        printValue(change.newValue);
    });

    try {
        console.log(`Initial value for readonly property 'aPlusB':`);
        console.log(stateContext.aPlusB);

        console.log(`set 'stateContext.a' to '100' will emit a change event for readonly property 'aPlusB'`);
        console.log(`Changed value for readonly property 'aPlusB':`);
        stateContext.a = 100;

        console.log(`set 'stateContext.b' to '200' will emit a change event for readonly property 'aPlusB'`);
        console.log(`Changed value for readonly property 'aPlusB':`);
        stateContext.b = 200;

    } finally {
        changeSubscription.unsubscribe();
        // Always release the state when it is no longer needed.
        stateContext.dispose();
    }
})();
```

**Output:**

```console
Running demo: demo/src/rs-x-state-manager/register-readonly-property.ts
Initial value for readonly property 'aPlusB':
30
set 'stateContext.a' to '100' will emit a change event for readonly property 'aPlusB'
Changed value for readonly property 'aPlusB':
120
set 'stateContext.b' to '200' will emit a change event for readonly property 'aPlusB'
Changed value for readonly property 'aPlusB':
300
```

---

### State registration is idempotent

You can register the same state item multiple times.  
Never assume a state is already registered. Always register it if you depend on it.  
Otherwise the state may disappear when another part of the system unregisters it. The state manager keeps track of a reference count and will release the state when it goes to zero.

When done, release the state:

```ts
import { InjectionContainer, printValue } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

export const run = (() => {
    const stateManager: IStateManager = InjectionContainer.get(
        RsXStateManagerInjectionTokens.IStateManager
    );
    const stateContext = {
        x: { y: 10 }
    };
    const changedSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        printValue(change.newValue);
    });

    try {
        // Register is idempotent: you can register the same state multiple times.
        // For every register call, make sure you call unregister when you're done.
        console.log('Initial value:');
        stateManager.watchState(stateContext, 'x');
        stateManager.watchState(stateContext, 'x');

        console.log('Changed value:');
        stateContext.x = { y: 20 };

        stateManager.releaseState(stateContext, 'x');

        console.log('Changed event is still emitted after unregister because one observer remains.');
        console.log('Changed value:');
        stateContext.x = { y: 30 };

        stateManager.releaseState(stateContext, 'x');

        console.log('Changed event is no longer emitted after the last observer unregisters.');
        console.log('Changed value:');
        console.log('---');
        stateContext.x = { y: 30 };

    } finally {
        changedSubscription.unsubscribe();
    }
})();
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

| Type        | Index                                                                                                                                                                        | Implementation         | example                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------------------------------- |
| Object      | any field/property                                                                                                                                                           | Patching               | [example](#object-propertyfield) |
| Date        | - year, utcYear<br>- month, utcMonth<br>- date, utcDate<br>- hours, utcHours<br>- minutes, utcMinutes<br>- seconds, utcSeconds<br>- milliseconds, utcMilliseconds<br>- times | Proxy                  | [example](#date)                 |
| Array       | number                                                                                                                                                                       | Proxy                  | [example](#array)                |
| Map         | any                                                                                                                                                                          | Proxy                  | [example](#map)                  |
| Set         | Not indexable                                                                                                                                                                | Proxy                  | [example](#set)                  |
| Promise     | Not indexable                                                                                                                                                                | Attach `.then` handler | [example](#promise)              |
| Observable  | Not indexable                                                                                                                                                                | Subscribe              | [example](#observable)           |
| Custom type | user defined                                                                                                                                                                 | user defined           | [example](#customtype)           |

State item is identified by a **context**,  **index** and **mustProxify** predicate for a recursive state item
The manager checks each observer factory to determine support based on the **context** and **index**.

Behavior:

- Both recursive and non-recursive observers monitor **assignment** of a new value.
- Recursive observers additionally monitor **internal changes** of the value. The nested values you want to monitor are determine by the **mustProxify** predicate.

The following example illustrates the different state types:

### Object property/field
**Example**
```ts
import { InjectionContainer, printValue, truePredicate } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

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

export const run = (() => {
    const stateManager: IStateManager = InjectionContainer.get(
        RsXStateManagerInjectionTokens.IStateManager
    );

    const stateContext = new StateContext();

    const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        printValue(change.newValue);
    });

    try {
        // Observe property `b` recursively.
        // Otherwise, only assigning a new value to stateContext.b would emit a change event.
        // This will emit a change event with the initial (current) value.
        console.log('Initial value:');
        stateManager.watchState(stateContext, 'b', truePredicate);

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
        // Always release the state when it is no longer needed.
        stateManager.releaseState(stateContext, 'b', truePredicate);
    }
})();
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

### Date
**Example**
```ts
import { InjectionContainer, truePredicate, utCDate } from '@rs-x/core';
import {
    IProxyRegistry,
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

function watchDate(stateManager: IStateManager) {
    console.log('\n******************************************');
    console.log('* Watching date');
    console.log('******************************************\n');

    const stateContext = {
        date: utCDate(2021, 2, 5)
    };
    const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        console.log(`${change.key}: ${(change.newValue as Date).toUTCString()}`);
    });
    try {
        console.log('Initial value:');
        stateManager.watchState(stateContext, 'date', truePredicate);

        console.log('Changed value:');
        stateContext.date.setFullYear(2023);

        console.log('Set value:');
        stateContext.date = new Date(2024, 5, 6);

        console.log('Latest value:');
        console.log(stateManager.getState<Date>(stateContext, 'date').toUTCString());
    } finally {
        changeSubscription.unsubscribe();
        // Always release the state when it is no longer needed.
        stateManager.releaseState(stateContext, 'date', truePredicate);
    }
}

function watchDateProperty(stateManager: IStateManager) {
    console.log('\n******************************************');
    console.log('* Watching year');
    console.log('******************************************\n');
    const date = utCDate(2021, 2, 5);
    const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        console.log(change.newValue);
    });
    try {
        // This will emit a change event with the initial (current) value.
        console.log('Initial value:');
        stateManager.watchState(date, 'year');

        const proxyRegister: IProxyRegistry = InjectionContainer.get(RsXStateManagerInjectionTokens.IProxyRegistry);
        const dateProxy = proxyRegister.getProxy<Date>(date);
        console.log('Changed value:');
        dateProxy.setFullYear(2023);

        console.log('Latest value:');
        console.log(stateManager.getState(date, 'year'));

    } finally {
        changeSubscription.unsubscribe();
        stateManager.releaseState(date, 'year');
    }
}

export const run = (() => {
    const stateManager: IStateManager = InjectionContainer.get(
        RsXStateManagerInjectionTokens.IStateManager
    );
    watchDate(stateManager);
    watchDateProperty(stateManager);
})();
```
**Output:**
```console
Running demo: demo/src/rs-x-state-manager/register-date.ts

******************************************
* Watching date
******************************************

Initial value:
date: Fri, 05 Mar 2021 00:00:00 GMT
Changed value:
date: Sun, 05 Mar 2023 00:00:00 GMT
Set value:
date: Thu, 06 Jun 2024 00:00:00 GMT
Latest value:
Thu, 06 Jun 2024 00:00:00 GMT

******************************************
* Watching year
******************************************

Initial value:
2021
Changed value:
2023
Latest value:
2023
```

### Array
**Example**
```ts
import { InjectionContainer, printValue, truePredicate } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

export const run = (() => {
    const stateManager: IStateManager = InjectionContainer.get(
        RsXStateManagerInjectionTokens.IStateManager
    );

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
        // This will emit a change event with the initial (current) value.
        console.log('Initial value:');
        stateManager.watchState(stateContext, 'array', truePredicate);

        console.log('Changed value:');
        stateContext.array[1].push(5);

        console.log('Latest value:');
        printValue(stateManager.getState(stateContext, 'array'));

    } finally {
        changeSubscription.unsubscribe();
        // Always release the state when it is no longer needed.
        stateManager.releaseState(stateContext, 'array', truePredicate);
    }
})();
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
import { InjectionContainer, printValue, truePredicate } from '@rs-x/core';
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

export const run = (() => {
    const stateContext = {
        map: new Map([
            ['a', [1, 2]],
            ['b', [3, 4]]
        ])
    };

    const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        printValue(change.newValue);
    });

    try {
        // This will emit a change event with the initial (current) value.
        console.log('Initial value:');
        stateManager.watchState(stateContext, 'map', truePredicate);

        console.log('Changed value:');
        stateContext.map.get('b').push(5);

        console.log('Latest value:');
        printValue(stateManager.getState(stateContext, 'map'))

    } finally {
        changeSubscription.unsubscribe();
        // Always release the state when it is no longer needed.
        stateManager.releaseState(stateContext, 'array', truePredicate);
    }
})();
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
import { InjectionContainer, printValue, truePredicate } from '@rs-x/core';
import {
    IProxyRegistry,
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

export const run = (() => {
    const stateManager: IStateManager = InjectionContainer.get(
        RsXStateManagerInjectionTokens.IStateManager
    );
    const item1 = [1, 2];
    const item2 = [3, 4];
    const stateContext = {
        set: new Set([item1, item2])
    };
    const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        printValue(change.newValue);
    });

    try {
        // This will emit a change event with the initial (current) value.
        console.log('Initial value:');
        stateManager.watchState(stateContext, 'set', truePredicate);

        console.log('Changed value:');
        const proxyRegister: IProxyRegistry = InjectionContainer.get(RsXStateManagerInjectionTokens.IProxyRegistry);
        proxyRegister.getProxy<number[]>(item2).push(5);

        console.log('Latest value:');
        printValue(stateManager.getState(stateContext, 'set'));

    } finally {
        changeSubscription.unsubscribe();
        // Always release the state when it is no longer needed.
        stateManager.releaseState(stateContext, 'set', truePredicate);
    }
})();
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
import { InjectionContainer, WaitForEvent } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

export const run = (async () => {
    const stateManager: IStateManager = InjectionContainer.get(
        RsXStateManagerInjectionTokens.IStateManager
    );

    const stateContext = {
        promise: Promise.resolve(10)
    };
    const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        console.log(change.newValue);
    });

    try {
        await new WaitForEvent(stateManager, 'changed').wait(() => {
            // This will emit a change event with the initial (current) value.
            console.log('Initial value:');
            stateManager.watchState(stateContext, 'promise');
        });

        await new WaitForEvent(stateManager, 'changed').wait(() => {
            console.log('Changed value:');
            let resolveHandler: (value: number) => void;
            stateContext.promise = new Promise((resolve) => { resolveHandler = resolve; });
            resolveHandler(30);
        });

        console.log(`Latest value: ${stateManager.getState(stateContext, 'promise')}`);
    } finally {
        changeSubscription.unsubscribe();
        // Always release the state when it is no longer needed.
        stateManager.releaseState(stateContext, 'promise');
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
import { InjectionContainer, WaitForEvent } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';
import { of, Subject } from 'rxjs';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

export const run = (async () => {
    const stateManager: IStateManager = InjectionContainer.get(
        RsXStateManagerInjectionTokens.IStateManager
    );

    const stateContext = {
        observable: of(10)
    };

    const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        console.log(change.newValue);
    });

    try {
        // We need to wait here until the event is emitted,
        // otherwise the demo will exit before the change event occurs.
        await new WaitForEvent(stateManager, 'changed').wait(() => {
            // This will emit a change event with the initial (current) value.
            console.log('Initial value:');
            stateManager.watchState(stateContext, 'observable');
        });

        await new WaitForEvent(stateManager, 'changed').wait(() => {
            console.log('Changed value:');
            const subject = new Subject<number>();
            stateContext.observable = subject
            subject.next(30);
        });

        console.log(`Latest value: ${stateManager.getState(stateContext, 'observable')}`);

    } finally {
        changeSubscription.unsubscribe();
        // Always release the state when it is no longer needed.
        stateManager.releaseState(stateContext, 'observable');
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
import {
    IDisposableOwner,
    IErrorLog,
    IGuidFactory,
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
        @Inject(RsXCoreInjectionTokens.IGuidFactory)
        guidFactory: IGuidFactory,
        @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
        indexValueAccessor: IIndexValueAccessor,
        @Inject(RsXStateManagerInjectionTokens.IProxyRegistry)
        proxyRegister: IProxyRegistry
    ) {
        super(
            objectObserverManager,
            textDocumenIndexObserverManager,
            errorLog,
            guidFactory,
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

