# rx-x-state-manager

The **State Manager** provides an efficient way to observe and synchronize state changes across your application. State always lives on on a certain context and is identified by and index:

- Object property or field. The index is the property or field name
- Array item. The index is a number refering to the position in an array
- Map item. The index is the belonging map key

State item is defined by two determinants. A context and index but the statemanegr doesn' really know how to resolve an detect changes for the value for it given the context and indes. It uses two service for that:

- A service implementing the interface ```IObjectPropertyObserverProxyPairManager```. This service is responsible for creating a observer for the state and proxified the value if needed

- A service implementing the interface ```IIndexValueAccessor```. This servive is used to get the current value


### Get an instance of the state manager

The statem manager has been register as singleton service and the following example show how to get an instance of it


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
    {% include_relative demo/src/register-non-recursive-state.ts %}
    ```

    ```
    #### Output

    ```console
    ********************************
    Register non recusrive state
    ********************************
    Initial value:
    10
    Changed value:
    20
    ```

- Recursive: will monitor both the setting of the value and the change of the value it self. For example if the index value is an object it will monitor changed for the object


    ```ts
    {% include_relative demo/src/register-recursive-state.ts %}
    ```