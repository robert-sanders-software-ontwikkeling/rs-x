import { InjectionContainer, printValue, truePredicate } from '@rs-x/core';
import {
    type IStateChange,
    type IStateManager,
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