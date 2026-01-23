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
        array: [
            [1, 2],
            [3, 4]
        ]
    };

    const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        printValue(change.newValue);
    });

    try {
        // This will emit a change event with the initial (current) value.
        console.log('Initial value:');
        stateManager.watchState(stateContext, 'array', truePredicate);

        console.log('Changed value:');
        stateContext.array[1].push(5);

        console.log('Latest value:');
        printValue(stateManager.getState(stateContext, 'array'));

    } finally {
        changeSubscription.unsubscribe();
        // Always release the state when it is no longer needed.
        stateManager.releaseState(stateContext, 'array', truePredicate);
    }
})();