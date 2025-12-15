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

   
    stateManager.changed.subscribe((change: IStateChange) => {
        printValue(change.newValue)
    });

    // We register recursive state by passing in
    // a predicate as the third argument.
    // This will emit an initial value { y: 10 }
    console.log('Initial value:');
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
})();