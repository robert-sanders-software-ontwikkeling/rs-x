import { InjectionContainer, printValue, truePredicate } from '@rs-x/core';
import {
    type IProxyRegistry,
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
    const item1 = [1, 2];
    const item2 = [3, 4];
    const stateContext = {
        set: new Set([item1, item2])
    };
    const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        printValue(change.newValue);
    });

    try {
        // This will emit a change event with the initial (current) value.
        console.log('Initial value:');
        stateManager.watchState(stateContext, 'set', truePredicate);

        console.log('Changed value:');
        const proxyRegister: IProxyRegistry = InjectionContainer.get(RsXStateManagerInjectionTokens.IProxyRegistry);
        proxyRegister.getProxy<number[]>(item2).push(5);

        console.log('Latest value:');
        printValue(stateManager.getState(stateContext, 'set'));

    } finally {
        changeSubscription.unsubscribe();
        // Always release the state when it is no longer needed.
        stateManager.releaseState(stateContext, 'set', truePredicate);
    }
})();