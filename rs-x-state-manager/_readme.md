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
{% include_relative ../demo/src/rs-x-state-manager/register-non-recursive-state.ts %}
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
{% include_relative ../demo/src/rs-x-state-manager/register-recursive-state.ts %}
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
{% include_relative ../demo/src/rs-x-state-manager/register-readonly-property.ts %}
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
{% include_relative ../demo/src/rs-x-state-manager/register-state-is-idempotent.ts %}
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
{% include_relative ../demo/src/rs-x-state-manager/register-property.ts %}
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
{% include_relative ../demo/src/rs-x-state-manager/register-date.ts %}
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
{% include_relative ../demo/src/rs-x-state-manager/register-array.ts %}
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
{% include_relative ../demo/src/rs-x-state-manager/register-map.ts %}
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
{% include_relative ../demo/src/rs-x-state-manager/register-set.ts %}
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
{% include_relative ../demo/src/rs-x-state-manager/register-promise.ts %}
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
{% include_relative ../demo/src/rs-x-state-manager/register-observable.ts %}
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
{% include_relative ../demo/src/rs-x-state-manager/state-manager-customize.ts %}
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

