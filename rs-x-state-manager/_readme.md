# rx-x-state-manager

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

## Customize the State Manager

The state manager works by creating **observers** based on the data type of the registered state.  
It uses a chain of **observer factories**, each capable of determining whether it supports a particular type.  
The **first factory** that returns `true` is used.

You can override this factory list by providing your own custom provider service.

### Built-in supported types

| Context      | Index          | Implementation        |
| ------------ | -------------- | --------------------- |
| Object       | field/property | Patching              |
| Array        | number         | Proxy                 |
| Map          | any            | Proxy                 |
| Set          | Not indexable  | Proxy                 |
| Promise      | Not indexable  | Attach `.then` handler |
| Observable   | Not indexable  | Subscribe             |

State consists of **context** and **index**.  
The manager checks each observer factory to determine support based on these two values.

Behavior:

- Both recursive and non-recursive observers monitor **assignment** of a new value.
- Recursive observers additionally monitor **internal changes** of the value.

### To add support for a custom data type:

1. Create an accessor to retrieve index values on your type.  
2. Create a factory to create an observer for your data type.  
3. Create a factory to create an observer for an index on your data instance.

The following example demonstrates adding support for a custom `TextDocument` class:

```ts
{% include_relative ../demo/src/rs-x-state-manager/state-manager-customize.ts %}
```