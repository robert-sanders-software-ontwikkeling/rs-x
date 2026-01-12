# Core

Provides shared core functionality for the RS-X project:

*  [Dependency Injection](#dependency-injection)
*  [Deep Clone](#deep-clone) 
*  [Deep Equality](#deep-equality)
*  [Guid Factory](#guid-factory)
*  [Index Value Accessor](#index-value-accessor)
*  [Singleton factory](#singleton-factory)
*  [Error Log](#error-log)
*  [WaitForEvent](#waitforevent)

## Dependency Injection

Implemented with [Inversify](https://github.com/inversify/InversifyJS)

The following aliases were added to make them consistent with the code style used throughout the project:

* `inject` renamed to `Inject`,
* `multiInject` renamed to  `MultiInject`,
* `injectable` renamed to  `Injectable`,
* `unmanaged` renamed to  `Unmanaged`,
* `preDestroy` renamed to  `PreDestroy`

In addition, the following extensions were added to Inversify:

### Multi-Inject Service Utilities

These functions help manage **multi-injectable services** in an Inversify `Container` or `ContainerModuleLoadOptions`. They allow registering multiple implementations for a single token and overriding existing multi-inject lists.

---

#### `registerMultiInjectServices(options, multiInjectToken, services)`

Registers multiple services under a single multi-inject token.

**Parameters:**

| Parameter          | Type                         | Description                                                                                                          |
| ------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `options`          | `ContainerModuleLoadOptions` | The container or module options used for binding.                                                                    |
| `multiInjectToken` | `symbol`                     | The multi-inject token that groups the services.                                                                     |
| `services`         | `MultiInjectService[]`       | Array of service definitions to register. Each service must define a `target` (class) and optional `token` (symbol). |

**Behavior:**
- Iterates through the list of services and registers each using `registerMultiInjectService`.
- Each service is bound to the container and added to the multi-inject token.

---

#### `registerMultiInjectService(container, target, options)`

Registers a single service under a multi-inject token.

**Parameters:**

| Parameter   | Type                                      | Description                                                                          |
| ----------- | ----------------------------------------- | ------------------------------------------------------------------------------------ |
| `container` | `ContainerModuleLoadOptions \| Container` | The container or module to bind to.                                                  |
| `target`    | `Newable<unknown>`                        | The class to bind.                                                                   |
| `options`   | `IMultiInjectTokens`                      | Object containing: `multiInjectToken` (symbol) and optional `serviceToken` (symbol). |

**Behavior:**
- Binds the class itself as a singleton.
- Optionally binds a service token to the class.
- Adds the class to the multi-inject token.

---

#### `overrideMultiInjectServices(container, multiInjectToken, services)`

Overrides an existing multi-inject list, removing any previous bindings for the given token.

**Parameters:**

| Parameter          | Type                                      | Description                               |
| ------------------ | ----------------------------------------- | ----------------------------------------- |
| `container`        | `Container \| ContainerModuleLoadOptions` | The container or module to bind to.       |
| `multiInjectToken` | `symbol`                                  | The multi-inject token to override.       |
| `services`         | `MultiInjectService[]`                    | Array of service definitions to register. |

**Behavior:**
- Removes all previous bindings for the given `multiInjectToken`.
- Binds each service in the list to the container as a singleton.
- Binds optional service tokens if provided.
- Ensures no duplicate classes are added to the multi-inject token.

**Usage Notes:**
- Use this function when you want to completely replace the multi-inject service list.
- Ensures that `container.getAll(multiInjectToken)` returns only the new services without duplicates.


## Deep Clone

 - Uses [structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone) by default  
- Falls back to [Lodash `cloneDeepWith`](https://lodash.com/docs/4.17.15#cloneDeepWith) for unsupported types

### Get an instance of the Deep clone service

The deep clone service is registered as a **singleton service**.  
You must load the core module into the injection container if you went
to use it.

```ts
import { 
    InjectionContainer, 
    RsXCoreModule 
} from '@rs-x/core';

InjectionContainer.load(RsXCoreModule);
```

There are two ways to get an instance:

1. Using the injection container

    ```ts
    import { 
        IDeepClone,
        InjectionContainer, 
        RsXCoreInjectionTokens 
    } from '@rs-x/core';
  
    const deepClone: IDeepClone = InjectionContainer.get(
        RsXCoreInjectionTokens.IDeepClone
    );
    ```

2. Using the `@Inject` decorator

    ```ts
    import { 
        IDeepClone,
        Inject, 
        RsXCoreInjectionTokens 
    } from '@rs-x/core';
   
    export class MyClass {

        constructor(
            @Inject(RsXCoreInjectionTokens.IDeepClone)
            private readonly _deepClone: IDeepClone
        ) {}
    }
    ```

The following example shows how to use deep clone service:

```ts
{% include_relative ../demo/src/rs-x-core/deep-clone.ts %}
```

**Output:**
```console
Running demo: demo/src/rs-x-core/deep-clone.ts
Clone is a copy of the cloned object: true
Cloned object
{
    a: 10
    nested: {
        b: 20
    }
}
```

## Deep Equality

Uses [fast-equals](https://github.com/planttheidea/fast-equals) for deep equality

### Get an instance of the Equality Service

The equality service is registered as a **singleton service**.  
You must load the core module into the injection container if you went
to use it.

```ts
import { 
    InjectionContainer, 
    RsXCoreModule 
} from '@rs-x/core';

InjectionContainer.load(RsXCoreModule);
```

There are two ways to get an instance:

1. Using the injection container

    ```ts
    import { 
        IEqualityService,
        InjectionContainer,
        RsXCoreInjectionTokens 
    } from '@rs-x/core';
  
    const equalityService: IEqualityService = InjectionContainer.get(
        RsXCoreInjectionTokens.IEqualityService
    );
    ```

2. Using the `@Inject` decorator

    ```ts
    import { 
        IEqualityService,
        Inject,
        RsXCoreInjectionTokens 
    } from '@rs-x/core';
   
    export class MyClass {

        constructor(
            @Inject(RsXCoreInjectionTokens.IEqualityService)
            private readonly _equalityService: IEqualityService
        ) {}
    }
    ```

The following example shows how to use equality service

```ts
{% include_relative ../demo/src/rs-x-core/equality-service.ts %}
```

**Output:**
```console
Running demo: demo/src/rs-x-core/equality-service.ts
{
    a: 10
    nested: {
        b: 20
    }
}
is equal to
{
    a: 10
    nested: {
        b: 20
    }
}
Result: true
```

## Guid Factory

Uses crypto.randomUUID() to create GUIDs

### Get an instance of a Guid Factory

The guid factory is registered as a **singleton service**.  
You must load the core module into the injection container if you went
to use it.

```ts
import { 
    InjectionContainer, 
    RsXCoreModule 
} from '@rs-x/core';

InjectionContainer.load(RsXCoreModule);
```

There are two ways to get an instance:

1. Using the injection container

    ```ts
    import { 
        IGuidFactory,
        InjectionContainer, 
        RsXCoreInjectionTokens 
    } from '@rs-x/core';
  
    const guidFactory: IGuidFactory = InjectionContainer.get(
        RsXCoreInjectionTokens.IGuidFactory
    );
    ```

2. Using the `@Inject` decorator

    ```ts
    import { 
        IGuidFactory,
        Inject, 
        RsXCoreInjectionTokens 
    } from '@rs-x/core';
   
    export class MyClass {

        constructor(
            @Inject(RsXCoreInjectionTokens.IGuidFactory)
            private readonly _guidFactory: IGuidFactory
        ) {}
    }
    ```

The following example shows how to use the guid factory

```ts
{% include_relative ../demo/src/rs-x-core/guid-factory.ts %}
```

**Output:**
```console
Running demo: demo/src/rs-x-core/guid-factory.ts
Created guid 1f64aabb-a57e-42e7-9edf-71c24773c150
```

## Index Value Accessor

Normalizes access to object properties, array indices, map keys, and similar index-based data structures.

### The `IIndexValueAccessor` interface

    export interface IIndexValueAccessor<TContext = unknown, TIndex = unknown> {
        isAsync(
            context: TContext,
            index: TIndex
        ): boolean;

        getResolvedValue(
            context: TContext,
            index: TIndex
        ): unknown;

        hasValue(
            context: TContext,
            index: TIndex
        ): boolean;

        getValue(
            context: TContext,
            index: TIndex
        ): unknown;

        setValue(
            context: TContext,
            index: TIndex,
            value: unknown
        ): void;

        getIndexes(
            context: TContext,
            index?: TIndex
        ): IterableIterator<TIndex>;

        applies(
            context: unknown,
            index: TIndex
        ): boolean;
    }

---

### Members

### **priority**
**Type:** `number`  
Defines the priority of the index value accessor. Higher numbers indicate higher priority when selecting which accessor to use.

---

#### **isAsync(context, index)**

Returns `true` if accessing the given index is asynchronous, for example when it yields a `Promise` or an `Observable`.

| Parameter   | Type      | Description          |
| ----------- | --------- | -------------------- |
| **context** | `unknown` | The index context.   |
| **index**   | `unknown` | The index to access. |

**Returns:** `boolean` — `true` if the index access is asynchronous; otherwise `false`.

---

#### **getResolvedValue(context, index)**

Returns the resolved value of the index.

The resolved value differs from the raw index value when the index returns a `Promise` or an `Observable`. In such cases, the raw value is the `Promise` or `Observable`, while the resolved value is the value produced by it.

| Parameter   | Type      | Description          |
| ----------- | --------- | -------------------- |
| **context** | `unknown` | The index context.   |
| **index**   | `unknown` | The index to access. |

**Returns:** `unknown` — the resolved index value.

---

#### **hasValue(context, index)**

Returns `true` if the index has a value in the given context.

| Parameter   | Type      | Description          |
| ----------- | --------- | -------------------- |
| **context** | `unknown` | The index context.   |
| **index**   | `unknown` | The index to access. |

**Returns:** `boolean` — `true` if the index has a value; otherwise `false`.

---

#### **getValue(context, index)**

Returns the raw value of the index.

| Parameter   | Type      | Description          |
| ----------- | --------- | -------------------- |
| **context** | `unknown` | The index context.   |
| **index**   | `unknown` | The index to access. |

**Returns:** `unknown` — the index value.

---

#### **setValue(context, index, value)**

Sets the value of the index.

| Parameter   | Type      | Description          |
| ----------- | --------- | -------------------- |
| **context** | `unknown` | The index context.   |
| **index**   | `unknown` | The index to access. |
| **value**   | `unknown` | The new index value. |

**Returns:** `void`

---

#### **getIndexes(context)**

Returns all indexes defined for the given context.

| Parameter   | Type      | Description        |
| ----------- | --------- | ------------------ |
| **context** | `unknown` | The index context. |

**Returns:** `IterableIterator<TIndex>` — the supported indexes.

---

#### **applies(context, index)**

Returns `true` if this index value accessor supports the given `(context, index)` pair.

| Parameter   | Type      | Description          |
| ----------- | --------- | -------------------- |
| **context** | `unknown` | The index context.   |
| **index**   | `unknown` | The index to access. |

**Returns:** `boolean` — `true` if the `(context, index)` pair is supported.

---

The default `IIndexValueAccessor` implementation internally uses the following list of `IIndexValueAccessor` implementations.  
The accessors are evaluated in order of **priority**, with higher-priority accessors being checked first:

* **`PropertyValueAccessor`** – accesses properties or fields on an object. Priority = 7
* **`MethodAccessor`** – accesses methods on an object. Priority = 6
* **`ArrayIndexAccessor`** – accesses array items. Priority = 5
* **`MapKeyccessor`** – accesses map items. Priority = 4
* **`SetKeyAccessor`** – accesses `Set` items. Priority = 3
* **`ObservableAccessor`** – accesses the latest value emitted by an `Observable`. Priority = 2
* **`PromiseAccessor`** – accesses the resolved value of a `Promise`. Priority = 1
* **`DatePropertyAccessor`** – accesses date-related properties. Priority = 0

The default accessor attempts to find the appropriate index value accessor for a given `(context, index)` pair and delegates the operation to it.

If no suitable index value accessor can be found, an `UnsupportedException` is thrown.

### Get an instance of the Index Value Accessor Service

The  index value accessor service is registered as a **singleton service**.  
You must load the core module into the injection container if you went
to use it.

```ts
import {
    InjectionContainer,
    RsXCoreModule
} from '@rs-x/core';

InjectionContainer.load(RsXCoreModule);
```

There are two ways to get an instance:

1. Using the injection container

    ```ts
    import { 
        IIndexValueAccessor, 
        InjectionContainer, 
        RsXCoreInjectionTokens 
    } from '@rs-x/core';
  
    const indexValueAccessor: IIndexValueAccessor = InjectionContainer.get(
        RsXCoreInjectionTokens.IIndexValueAccessor
    );
    ```

2. Using the `@Inject` decorator

    ```ts
    import { 
        IIndexValueAccessor,
        Inject, 
        RsXCoreInjectionTokens 
    } from '@rs-x/core';
   
    export class MyClass {

        constructor(
            @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
            private readonly _indexValueAccessor: IIndexValueAccessor
        ) {}
    }
    ```

### Customize the supported index value accessor list

There are two ways to customize the index value accessor list.

1. You want add new index value accessor list. Use the `@IndexAccessor` decorator:

    ```ts
    {% include_relative ../demo/src/rs-x-core/add-custom-index-value-accessor.ts %}
    ```
2. Redefine index value accessor list:
    ```ts
    {% include_relative ../demo/src/rs-x-core/redefine-custom-index-value-accessor-list.ts %}
    ```

## Singleton factory

Besides static singleton services registered via the dependency injection framework, we sometimes want to be able to create **dynamic singleton services**. These are services that are created based on dynamic data.

For example, suppose we have a service that patches a property on an object so it can emit an event whenever the property value changes. In this scenario, we want to ensure that the property is patched **only once**. The example below shows how we can use `SingletonFactory` to implement this:

```ts
{% include_relative ../demo/src/rs-x-core/implementation-of-singleton-factory.ts %}
```

**Output:**
```console
 Running demo: demo/src/rs-x-core/implementation-of-singleton-factory.ts
You can observe the same property multiple times but only one observer will be create:
true
Changing value to 20:
Observer 1:
20
Observer 2:
20
```

In this example, we have derived two classes from `SingletonFactory`:

* **`PropertyObserverManager`** – ensures that only one `PropertyObserver` is created per property.
* **`ObjectPropertyObserverManager`** – ensures that only one `PropertyObserverManager` is created per object.

It is good practice **not to expose classes derived from `SingletonFactory`** directly, but to use them internally to keep the interface simple.  

For example, we have created a class **`PropertyObserverFactory`** that internally uses `ObjectPropertyObserverManager`.  

The `PropertyObserver` class implements a `dispose` method, which ensures that it is released when there are no references left.


## Error Log

Basic logging using `console.error`

### interface IErrorLog



```ts
export interface IErrorLog {
   readonly error: Observable<IError>;
   add(error: IError): void;
   clear(): void;
}
```

### Members

### **error**
**Type:** `Observable<IError>`  
event emitted when error is added

---

#### **add(error)**
log a new error and emit error event.

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| **error** | `IError` | error.      |


**Returns:** `void` 

---

#### **clear()**
removes all logged errors

**Returns:** `void` 

---

The default implementation uses `console.error` to log an error.


### Get an instance of the Error Log

The error log is registered as a **singleton service**.  
You must load the core module into the injection container if you went
to use it.

```ts
import { 
    InjectionContainer,
    RsXCoreModule
} from '@rs-x/core';

InjectionContainer.load(RsXCoreModule);
```

There are two ways to get an instance:

1. Using the injection container

    ```ts
    import { 
        IErrorLog, 
        InjectionContainer, 
        RsXCoreInjectionTokens 
    } from '@rs-x/core';
  
    const errorLog: IErrorLog = InjectionContainer.get(
        RsXCoreInjectionTokens.IErrorLog
    );
    ```

2. Using the `@Inject` decorator

    ```ts
    import { 
        IErrorLog,
        Inject, 
        RsXCoreInjectionTokens 
    } from '@rs-x/core';
   
    export class MyClass {

        constructor(
            @Inject(RsXCoreInjectionTokens.IErrorLog)
            private readonly _errorLog: IErrorLog
        ) {}
    }
    ```

The following example shows how to use the error log

```ts
{% include_relative ../demo/src/rs-x-core/error-log.ts %}
```

**Output:**
```console
Running demo: demo/src/rs-x-core/error-log.ts
Emmitted error
{
    exception: Error: Oops an error
    message: Oops
    context: {
        name: My error context
    }
}
```

## WaitForEvent

### Overview

`WaitForEvent` is a utility class that allows you to **wait for one or more emissions from an RxJS `Observable`** exposed as a property on an object.  
It is particularly useful in **tests**, **async workflows**, and **event-driven logic**, where you need to trigger an action and then await observable events with optional constraints such as timeouts or emission counts.

---

### Key Features

- Waits for one or multiple observable emissions
- Supports synchronous, `Promise`, or `Observable` triggers
- Optional timeout handling
- Ability to ignore the initial observable value. For example when the event is implemented with  `BehaviorSubject` or  `ReplaySubject`

---

### Constructor

```ts
constructor(
   target: T,
   eventName: E,
   options?: WaitOptions<T, E, R>
)
```

| Parameter | Type                 | Description                                |
| --------- | -------------------- | ------------------------------------------ |
| target    | T                    | Object containing the observable event     |
| eventName | E                    | Name of the observable property to wait on |
| options   | WaitOptions<T, E, R> | Optional configuration                     |


#### `WaitOptions<T, E, R>`

Configuration options for waiting.

| Property / Option  | Type      | Default | Description                    |
| ------------------ | --------- | ------- | ------------------------------ |
| count              | `number`  | 1       | Number of events to wait for   |
| timeout            | `number`  | 100     | Timeout in milliseconds        |
| ignoreInitialValue | `boolean` | false   | Ignore the first emitted value |

---            

 
### Methods

#### **wait(trigger)**

Waits for the observable to emit the specified number of events after running the trigger.

| Parameter | Type                                                  | Description                |
| --------- | ----------------------------------------------------- | -------------------------- |
| trigger   | () => void \| Promise<unknown> \| Observable<unknown> | action triggering the even |

**Returns:** `Promise<R | null>` resolving to the emitted value(s) or `null` if timeout occurs.

---


### Example

```ts
{% include_relative ../demo/src/rs-x-core/wait-for-event.ts %}
```

**Output:**
```console
Running demo: demo/src/rs-x-core/wait-for-event.ts
Emitted events:
[
    Hello,
    hi
]
```