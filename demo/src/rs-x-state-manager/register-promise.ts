import { InjectionContainer, WaitForEvent } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

export const run = (async () => {
    const stateManager: IStateManager = InjectionContainer.get(
        RsXStateManagerInjectionTokens.IStateManager
    );

    const stateContext = {
        promise: Promise.resolve(10)
    };
    const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        console.log(change.newValue);
    });

    try {
       

        await new WaitForEvent(stateManager, 'changed').wait(() => {
            // This will emit a change event with the initial (current) value.
            console.log('Initial value:');
            stateManager.register(stateContext, 'promise');
        });

        await new WaitForEvent(stateManager, 'changed').wait(() => {
            console.log('Changed value:');
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