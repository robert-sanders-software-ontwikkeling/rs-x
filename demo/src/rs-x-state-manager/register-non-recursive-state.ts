import { InjectionContainer, printValue } from '@rs-x/core';
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

    // This will emit a change event with the initial (current) value.
    console.log('Initial value:');
    const changedSubsription = stateManager.changed.subscribe((change: IStateChange) => {
        printValue(change.newValue);
    });

    try {
        // This will emit the new value { y: 10 }
        stateManager.watchState(stateContext, 'x');

        console.log('Changed value:');
        // This will emit the new value { y: 10 }
        stateContext.x = {
            y: 20
        };

        console.log(`Latest value:`);
        printValue(stateManager.getState(stateContext, 'x'));

        // This will emit no change because the state is not recursive.
        console.log('\nstateContext.x.y = 30 will not emit any change:\n---\n');
        stateContext.x.y = 30;

    } finally {
        changedSubsription.unsubscribe();
        // Always release the state when it is no longer needed.
        stateManager.releaseState(stateContext, 'x');
    }
})();
