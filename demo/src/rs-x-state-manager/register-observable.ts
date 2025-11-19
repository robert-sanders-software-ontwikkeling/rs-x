import { InjectionContainer, WaitForEvent } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';
import { of, Subject } from 'rxjs';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager
);

const stateContext = {
    observable: of(10)
};

export const run = (async () => {
    const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        console.log(change.newValue);
    });

    try {
        // Observe the observable.
        // Will emit a change event with the initial value.
        console.log('Initial value:');

        // We need to wait here until the event is emitted,
        // otherwise the demo will exit before the change event occurs.
        await new WaitForEvent(stateManager, 'changed').wait(() => {
            stateManager.register(stateContext, 'observable');
        });

        console.log('Changed value:');

        await new WaitForEvent(stateManager, 'changed').wait(() => {
            const subject = new Subject<number>();
            stateContext.observable = subject
            subject.next(30);
        });


        console.log(`Latest value: ${stateManager.getState(stateContext, 'observable')}`);

    } finally {
        changeSubscription.unsubscribe();
        stateManager.unregister(stateContext, 'observable');
    }
})();