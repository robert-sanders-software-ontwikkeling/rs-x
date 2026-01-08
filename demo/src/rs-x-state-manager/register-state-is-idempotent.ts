import { InjectionContainer, printValue } from '@rs-x/core';
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
    const changedSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        printValue(change.newValue);
    });

    try {
        // Register is idempotent: you can register the same state multiple times.
        // For every register call, make sure you call unregister when you're done.
        console.log('Initial value:');
        stateManager.watchState(stateContext, 'x');
        stateManager.watchState(stateContext, 'x');

        console.log('Changed value:');
        stateContext.x = { y: 20 };

        stateManager.releaseState(stateContext, 'x');

        console.log('Changed event is still emitted after unregister because one observer remains.');
        console.log('Changed value:');
        stateContext.x = { y: 30 };

        stateManager.releaseState(stateContext, 'x');

        console.log('Changed event is no longer emitted after the last observer unregisters.');
        console.log('Changed value:');
        console.log('---');
        stateContext.x = { y: 30 };

    } finally {
        changedSubscription.unsubscribe();
    }
})();