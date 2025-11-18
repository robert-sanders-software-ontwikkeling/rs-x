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
    {% include_relative ../demo/src/rs-x-state-manager/register-non-recursive-state.ts %}
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
    {% include_relative ../demo/src/rs-x-state-manager/register-recursive-state.ts %}
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
    {% include_relative ../demo/src/rs-x-state-manager/register-state-is-idempotent.ts %}
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
{% include_relative ../demo/src/rs-x-state-manager/state-manager-customize.ts %}
```