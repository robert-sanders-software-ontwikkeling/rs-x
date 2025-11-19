import { InjectionContainer, WaitForEvent } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager
);

const stateContext = {
    promise: Promise.resolve(10)
};

export const run = (async () => {
    const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        console.log(change.newValue);
    });

    try {
        console.log('Initial value:');

        await new WaitForEvent(stateManager, 'changed').wait(() => {
            stateManager.register(stateContext, 'promise');
        });

        console.log('Changed value:');

    
        await new WaitForEvent(stateManager, 'changed').wait(() => {
            let resolveHandler: (value: number) => void;
            stateContext.promise = new Promise((resolve) => { resolveHandler = resolve; });
            resolveHandler(30);
        });

        console.log(`Latest value: ${stateManager.getState(stateContext, 'promise')}`);
    } finally {
        changeSubscription.unsubscribe();
        stateManager.unregister(stateContext, 'promise');
    }
})();