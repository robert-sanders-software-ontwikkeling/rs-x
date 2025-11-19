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
{% include_relative ../demo/src/rs-x-state-manager/register-non-recursive-state.ts %}
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

### State registration is idempotent

You can register the same state multiple times.  
Never assume a state is already registered—always register if you depend on it.  
Otherwise the state may disappear when another part of the system unregisters it.

When done, unregister the state:

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

