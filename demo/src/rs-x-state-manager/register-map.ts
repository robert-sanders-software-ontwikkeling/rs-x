import { InjectionContainer, printValue, truePredicate } from '@rs-x/core';
import {
    type IStateChange,
    type IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager
);

export const run = (() => {
    const stateContext = {
        map: new Map([
            ['a', [1, 2]],
            ['b', [3, 4]]
        ])
    };

    const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        printValue(change.newValue);
    });

    try {
        // This will emit a change event with the initial (current) value.
        console.log('Initial value:');
        stateManager.watchState(stateContext, 'map', truePredicate);

        console.log('Changed value:');
        stateContext.map.get('b')?.push(5);

        console.log('Latest value:');
        printValue(stateManager.getState(stateContext, 'map'))

    } finally {
        changeSubscription.unsubscribe();
        // Always release the state when it is no longer needed.
        stateManager.releaseState(stateContext, 'array', truePredicate);
    }
})();