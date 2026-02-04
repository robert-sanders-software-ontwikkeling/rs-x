# Core

Provides shared core functionality for the RS-X project:

- [Dependency Injection](#dependency-injection)
- [Deep Clone](#deep-clone)
- [Deep Equality](#deep-equality)
- [Guid Factory](#guid-factory)
- [Index Value Accessor](#index-value-accessor)
- [Singleton factory](#singleton-factory)
- [Error Log](#error-log)
- [WaitForEvent](#waitforevent)

## Dependency Injection

Implemented with [Inversify](https://github.com/inversify/InversifyJS).

The following aliases were added to make them consistent with the code style used throughout the project:

- `inject` renamed to `Inject`
- `multiInject` renamed to `MultiInject`
- `injectable` renamed to `Injectable`
- `unmanaged` renamed to `Unmanaged`
- `preDestroy` renamed to `PreDestroy`

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
You must load the core module into the injection container if you want
to use it.

```ts
import { InjectionContainer, RsXCoreModule } from '@rs-x/core';

InjectionContainer.load(RsXCoreModule);
```

There are two ways to get an instance:

1. Using the injection container

   ```ts
   import {
     IDeepClone,
     InjectionContainer,
     RsXCoreInjectionTokens,
   } from '@rs-x/core';

   const deepClone: IDeepClone = InjectionContainer.get(
     RsXCoreInjectionTokens.IDeepClone,
   );
   ```

2. Using the `@Inject` decorator

   ```ts
   import { IDeepClone, Inject, RsXCoreInjectionTokens } from '@rs-x/core';

   export class MyClass {
     constructor(
       @Inject(RsXCoreInjectionTokens.IDeepClone)
       private readonly _deepClone: IDeepClone,
     ) {}
   }
   ```

The following example shows how to use deep clone service:

```ts
import {
  type IDeepClone,
  InjectionContainer,
  printValue,
  RsXCoreInjectionTokens,
  RsXCoreModule,
} from '@rs-x/core';

// Load the core module into the injection container
InjectionContainer.load(RsXCoreModule);
const deepClone: IDeepClone = InjectionContainer.get(
  RsXCoreInjectionTokens.IDeepClone,
);

export const run = (() => {
  const object = {
    a: 10,
    nested: {
      b: 20,
    },
  };
  const clone = deepClone.clone(object);

  console.log(`Clone is a copy of the cloned object: ${object !== clone}`);
  console.log('Cloned object');
  printValue(clone);
})();
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
You must load the core module into the injection container if you want
to use it.

```ts
import { InjectionContainer, RsXCoreModule } from '@rs-x/core';

InjectionContainer.load(RsXCoreModule);
```

There are two ways to get an instance:

1. Using the injection container

   ```ts
   import {
     IEqualityService,
     InjectionContainer,
     RsXCoreInjectionTokens,
   } from '@rs-x/core';

   const equalityService: IEqualityService = InjectionContainer.get(
     RsXCoreInjectionTokens.IEqualityService,
   );
   ```

2. Using the `@Inject` decorator

   ```ts
   import {
     IEqualityService,
     Inject,
     RsXCoreInjectionTokens,
   } from '@rs-x/core';

   export class MyClass {
     constructor(
       @Inject(RsXCoreInjectionTokens.IEqualityService)
       private readonly _equalityService: IEqualityService,
     ) {}
   }
   ```

The following example shows how to use equality service

```ts
import {
  type IEqualityService,
  InjectionContainer,
  printValue,
  RsXCoreInjectionTokens,
  RsXCoreModule,
} from '@rs-x/core';

// Load the core module into the injection container
InjectionContainer.load(RsXCoreModule);
const equalityService: IEqualityService = InjectionContainer.get(
  RsXCoreInjectionTokens.IEqualityService,
);

export const run = (() => {
  const object1 = {
    a: 10,
    nested: {
      b: 20,
    },
  };
  const object2 = {
    a: 10,
    nested: {
      b: 20,
    },
  };

  printValue(object1);
  console.log('is equal to');
  printValue(object2);

  const result = equalityService.isEqual(object1, object2);
  console.log(`Result: ${result}`);
})();
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
You must load the core module into the injection container if you want
to use it.

```ts
import { InjectionContainer, RsXCoreModule } from '@rs-x/core';

InjectionContainer.load(RsXCoreModule);
```

There are two ways to get an instance:

1. Using the injection container

   ```ts
   import {
     IGuidFactory,
     InjectionContainer,
     RsXCoreInjectionTokens,
   } from '@rs-x/core';

   const guidFactory: IGuidFactory = InjectionContainer.get(
     RsXCoreInjectionTokens.IGuidFactory,
   );
   ```

2. Using the `@Inject` decorator

   ```ts
   import { IGuidFactory, Inject, RsXCoreInjectionTokens } from '@rs-x/core';

   export class MyClass {
     constructor(
       @Inject(RsXCoreInjectionTokens.IGuidFactory)
       private readonly _guidFactory: IGuidFactory,
     ) {}
   }
   ```

The following example shows how to use the guid factory

```ts
import {
  type IGuidFactory,
  InjectionContainer,
  RsXCoreInjectionTokens,
  RsXCoreModule,
} from '@rs-x/core';

// Load the core module into the injection container
InjectionContainer.load(RsXCoreModule);
const guidFactory: IGuidFactory = InjectionContainer.get(
  RsXCoreInjectionTokens.IGuidFactory,
);

export const run = (() => {
  const guid = guidFactory.create();
  console.log(`Created guid: ${guid}`);
})();
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

- **`PropertyValueAccessor`** – accesses properties or fields on an object. Priority = 7
- **`MethodAccessor`** – accesses methods on an object. Priority = 6
- **`ArrayIndexAccessor`** – accesses array items. Priority = 5
- **`MapKeyccessor`** – accesses map items. Priority = 4
- **`SetKeyAccessor`** – accesses `Set` items. Priority = 3
- **`ObservableAccessor`** – accesses the latest value emitted by an `Observable`. Priority = 2
- **`PromiseAccessor`** – accesses the resolved value of a `Promise`. Priority = 1
- **`DatePropertyAccessor`** – accesses date-related properties. Priority = 0

The default accessor attempts to find the appropriate index value accessor for a given `(context, index)` pair and delegates the operation to it.

If no suitable index value accessor can be found, an `UnsupportedException` is thrown.

### Get an instance of the Index Value Accessor Service

The index value accessor service is registered as a **singleton service**.  
You must load the core module into the injection container if you want
to use it.

```ts
import { InjectionContainer, RsXCoreModule } from '@rs-x/core';

InjectionContainer.load(RsXCoreModule);
```

There are two ways to get an instance:

1. Using the injection container

   ```ts
   import {
     IIndexValueAccessor,
     InjectionContainer,
     RsXCoreInjectionTokens,
   } from '@rs-x/core';

   const indexValueAccessor: IIndexValueAccessor = InjectionContainer.get(
     RsXCoreInjectionTokens.IIndexValueAccessor,
   );
   ```

2. Using the `@Inject` decorator

   ```ts
   import {
     IIndexValueAccessor,
     Inject,
     RsXCoreInjectionTokens,
   } from '@rs-x/core';

   export class MyClass {
     constructor(
       @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
       private readonly _indexValueAccessor: IIndexValueAccessor,
     ) {}
   }
   ```

### Customize the supported index value accessor list

You can customize the index value accessor list by overriding it:

    ```ts
    import {
      ArrayIndexAccessor,
      ContainerModule,
      type IIndexValueAccessor,
      InjectionContainer,
      overrideMultiInjectServices,
      PropertyValueAccessor,
      RsXCoreInjectionTokens,
      RsXCoreModule,
    } from '@rs-x/core';

    // Load the core module into the injection container
    InjectionContainer.load(RsXCoreModule);

    export const MyModule = new ContainerModule((options) => {
      overrideMultiInjectServices(
        options,
        RsXCoreInjectionTokens.IIndexValueAccessorList,
        [
          {
            target: PropertyValueAccessor,
            token: RsXCoreInjectionTokens.IPropertyValueAccessor,
          },
          {
            target: ArrayIndexAccessor,
            token: RsXCoreInjectionTokens.IArrayIndexAccessor,
          },
        ],
      );
    });

    InjectionContainer.load(MyModule);
    const indexValueAccessor: IIndexValueAccessor = InjectionContainer.get(
      RsXCoreInjectionTokens.IIndexValueAccessor,
    );

    export const run = (() => {
      const object = {
        a: 10,
        array: [1, 2],
        map: new Map([['x', 300]]),
      };
      const aValue = indexValueAccessor.getValue(object, 'a');
      console.log(`Value of field 'a': ${aValue} `);

      const arrayValue = indexValueAccessor.getValue(object.array, 1);
      console.log(`Value of 'array[1]': ${arrayValue} `);

      let errrThrown = false;
      try {
        indexValueAccessor.getValue(object.map, 'x');
      } catch {
        errrThrown = true;
      }

      console.log(`Value of 'map['x'] will throw error: ${errrThrown}`);
    })();

    ```

## Singleton factory

Besides static singleton services registered via the dependency injection framework, we sometimes want to be able to create **dynamic singleton services**. These are services that are created based on dynamic data.

For example, suppose we have a service that patches a property on an object so it can emit an event whenever the property value changes. In this scenario, we want to ensure that the property is patched **only once**. The example below shows how we can use `SingletonFactory` to implement this:

```ts
import { type Observable, Subject } from 'rxjs';

import {
  type IDisposable,
  type IDisposableOwner,
  InvalidOperationException,
  type IPropertyChange,
  type IPropertyDescriptor,
  PropertyDescriptorType,
  SingletonFactory,
  Type,
  UnsupportedException,
} from '@rs-x/core';

interface IObserver extends IDisposable {
  changed: Observable<IPropertyChange>;
}

class PropertObserver implements IObserver {
  private _isDisposed = false;
  private _value: unknown;
  private _propertyDescriptorWithTarget: IPropertyDescriptor | undefined;
  private readonly _changed = new Subject<IPropertyChange>();

  constructor(
    private readonly _owner: IDisposableOwner,
    private readonly _target: object,
    private readonly _propertyName: string,
  ) {
    this.patch();
  }

  public get changed(): Observable<IPropertyChange> {
    return this._changed;
  }

  public dispose(): void {
    if (this._isDisposed) {
      return;
    }

    if (!this._owner?.canDispose || this._owner.canDispose()) {
      const propertyName = this._propertyName as string;
      const value = this._target[propertyName];
      //to prevent errors if is was non configurable
      delete this._target[propertyName];

      if (
        this._propertyDescriptorWithTarget?.type !==
        PropertyDescriptorType.Function
      ) {
        this._target[propertyName] = value;
      }

      this._propertyDescriptorWithTarget = undefined;
    }

    this._owner?.release?.();
  }

  private patch(): void {
    const descriptorWithTarget = Type.getPropertyDescriptor(
      this._target,
      this._propertyName,
    );
    const descriptor = descriptorWithTarget.descriptor;
    let newDescriptor: PropertyDescriptor;

    if (descriptorWithTarget.type === PropertyDescriptorType.Function) {
      throw new UnsupportedException('Methods are not supported');
    } else if (!descriptor.get && !descriptor.set) {
      newDescriptor = this.createFieldPropertyDescriptor(descriptorWithTarget);
    } else if (descriptor.set) {
      newDescriptor =
        this.createWritablePropertyDescriptor(descriptorWithTarget);
    } else {
      throw new InvalidOperationException(
        `Property '${this._propertyName}' can not be watched because it is readonly`,
      );
    }

    Object.defineProperty(this._target, this._propertyName, newDescriptor);

    this._propertyDescriptorWithTarget = descriptorWithTarget;
  }

  private emitChange(change: Partial<IPropertyChange>, id: unknown) {
    this._value = change.newValue;

    this._changed.next({
      arguments: [],
      ...change,
      chain: [{ context: this._target, index: this._propertyName }],
      target: this._target,
      index: id,
    });
  }

  private createFieldPropertyDescriptor(
    descriptorWithTarget: IPropertyDescriptor,
  ): PropertyDescriptor {
    const newDescriptor = { ...descriptorWithTarget.descriptor };

    newDescriptor.get = () => this._value;
    delete newDescriptor.writable;
    delete newDescriptor.value;

    newDescriptor.set = (value) => {
      if (value !== this._value) {
        this.emitChange({ newValue: value }, this._propertyName);
      }
    };

    this._value = this._target[this._propertyName];

    return newDescriptor;
  }

  private createWritablePropertyDescriptor(
    descriptorWithTarget: IPropertyDescriptor,
  ): PropertyDescriptor {
    const newDescriptor = { ...descriptorWithTarget.descriptor };
    const oldSetter = descriptorWithTarget.descriptor.set as (
      v: unknown,
    ) => void;
    newDescriptor.set = (value) => {
      const oldValue = this._target[this._propertyName];
      if (value !== oldValue) {
        oldSetter.call(this._target, value);
        this.emitChange({ newValue: value }, this._propertyName);
      }
    };

    this._value = this._target[this._propertyName];

    return newDescriptor;
  }
}

class PropertyObserverManager extends SingletonFactory<
  string,
  string,
  IObserver,
  string
> {
  constructor(
    private readonly _object: object,
    private readonly releaseObject: () => void,
  ) {
    super();
  }

  public override getId(propertyName: string): string {
    return propertyName;
  }

  protected override createId(propertyName: string): string {
    return propertyName;
  }

  protected override createInstance(
    propertyName: string,
    id: string,
  ): IObserver {
    return new PropertObserver(
      {
        canDispose: () => this.getReferenceCount(id) === 1,
        release: () => this.release(id),
      },
      this._object,
      propertyName,
    );
  }

  protected override onReleased(): void {
    this.releaseObject();
  }

  protected override releaseInstance(observer: IObserver): void {
    observer.dispose();
  }
}

class ObjectPropertyObserverManager extends SingletonFactory<
  object,
  object,
  PropertyObserverManager
> {
  constructor() {
    super();
  }

  public override getId(context: object): object {
    return context;
  }

  protected override createId(context: object): object {
    return context;
  }

  protected override createInstance(context: object): PropertyObserverManager {
    return new PropertyObserverManager(context, () => this.release(context));
  }
  protected override releaseInstance(
    propertyObserverManager: PropertyObserverManager,
  ): void {
    propertyObserverManager.dispose();
  }
}

class PropertyObserverFactory {
  private readonly _objectPropertyObserverManager =
    new ObjectPropertyObserverManager();

  public create(context: object, propertyName: string): IObserver {
    return this._objectPropertyObserverManager
      .create(context)
      .instance.create(propertyName).instance;
  }
}

export const run = (() => {
  const context = {
    a: 10,
  };
  const propertyObserverFactory = new PropertyObserverFactory();

  const aObserver1 = propertyObserverFactory.create(context, 'a');
  const aObserver2 = propertyObserverFactory.create(context, 'a');

  const changeSubsription1 = aObserver1.changed.subscribe((change) => {
    console.log('Observer 1:');
    console.log(change.newValue);
  });
  const changeSubsription2 = aObserver1.changed.subscribe((change) => {
    console.log('Observer 2:');
    console.log(change.newValue);
  });

  console.log(
    'You can observe the same property multiple times but only one observer will be create:',
  );
  console.log(aObserver1 === aObserver2);

  console.log('Changing value to 20:');

  context.a = 20;

  // Dispose of the observers
  aObserver1.dispose();
  aObserver2.dispose();
  // Unsubsribe to the changed event
  changeSubsription1.unsubscribe();
  changeSubsription2.unsubscribe();
})();
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

- **`PropertyObserverManager`** – ensures that only one `PropertyObserver` is created per property.
- **`ObjectPropertyObserverManager`** – ensures that only one `PropertyObserverManager` is created per object.

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
You must load the core module into the injection container if you want
to use it.

```ts
import { InjectionContainer, RsXCoreModule } from '@rs-x/core';

InjectionContainer.load(RsXCoreModule);
```

There are two ways to get an instance:

1. Using the injection container

   ```ts
   import {
     IErrorLog,
     InjectionContainer,
     RsXCoreInjectionTokens,
   } from '@rs-x/core';

   const errorLog: IErrorLog = InjectionContainer.get(
     RsXCoreInjectionTokens.IErrorLog,
   );
   ```

2. Using the `@Inject` decorator

   ```ts
   import { IErrorLog, Inject, RsXCoreInjectionTokens } from '@rs-x/core';

   export class MyClass {
     constructor(
       @Inject(RsXCoreInjectionTokens.IErrorLog)
       private readonly _errorLog: IErrorLog,
     ) {}
   }
   ```

The following example shows how to use the error log

```ts
import {
  type IErrorLog,
  InjectionContainer,
  printValue,
  RsXCoreInjectionTokens,
  RsXCoreModule,
  Type,
} from '@rs-x/core';

// Load the core module into the injection container
InjectionContainer.load(RsXCoreModule);
const errorLog: IErrorLog = InjectionContainer.get(
  RsXCoreInjectionTokens.IErrorLog,
);

export const run = (() => {
  const context = {
    name: 'My error context',
  };
  const changeSubscription = errorLog.error.subscribe((e) => {
    console.log('Emmitted error');
    printValue(e);
  });

  try {
    throw new Error('Oops an error');
  } catch (e) {
    errorLog.add({
      exception: Type.cast(e),
      message: 'Oops',
      context,
    });
  } finally {
    changeSubscription.unsubscribe();
  }
})();
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
- Ability to ignore the initial observable value. For example when the event is implemented with `BehaviorSubject` or `ReplaySubject`

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
import { type Observable, Subject } from 'rxjs';

import { printValue, WaitForEvent } from '@rs-x/core';

export const run = (async () => {
  class MyEventContext {
    private readonly _message = new Subject<string>();

    public get message(): Observable<string> {
      return this._message;
    }

    public emitMessage(message: string): void {
      this._message.next(message);
    }
  }

  const eventContext = new MyEventContext();
  const result = await new WaitForEvent(eventContext, 'message', {
    count: 2,
  }).wait(() => {
    eventContext.emitMessage('Hello');
    eventContext.emitMessage('hi');
  });
  console.log('Emitted events:');
  printValue(result);
})();
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
