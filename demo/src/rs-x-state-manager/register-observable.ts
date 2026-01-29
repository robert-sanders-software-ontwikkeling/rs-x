import { of, Subject } from 'rxjs';

import { InjectionContainer, WaitForEvent } from '@rs-x/core';
import {
    type IStateChange,
    type IStateManager,
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
        observable: of(10)
    };

    const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        console.log(change.newValue);
    });

    try {
        // We need to wait here until the event is emitted,
        // otherwise the demo will exit before the change event occurs.
        await new WaitForEvent(stateManager, 'changed').wait(() => {
            // This will emit a change event with the initial (current) value.
            console.log('Initial value:');
            stateManager.watchState(stateContext, 'observable');
        });

        await new WaitForEvent(stateManager, 'changed').wait(() => {
            console.log('Changed value:');
            const subject = new Subject<number>();
            stateContext.observable = subject
            subject.next(30);
        });

        console.log(`Latest value: ${stateManager.getState(stateContext, 'observable')}`);

    } finally {
        changeSubscription.unsubscribe();
        // Always release the state when it is no longer needed.
        stateManager.releaseState(stateContext, 'observable');
    }
})();