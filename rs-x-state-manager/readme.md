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