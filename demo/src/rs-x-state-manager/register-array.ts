import { InjectionContainer, truePredicate } from '@rs-x/core';
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

function printValue(object: unknown): void {
    console.log(JSON.stringify(object, null, 4).replaceAll('"', ''));
}

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
    // Otherwise, only assigning a new value to stateContext.array would emit a change event.
    // This will emit a change event with the initial (current) value.
    console.log('Initial value:');

    stateManager.register(stateContext, 'array', truePredicate);

    console.log('Changed value:');
    stateContext.array[1].push(5);

    console.log('Latest value:');
    printValue(stateManager.getState(stateContext,'array'));

} finally {
    changeSubscription.unsubscribe();
    stateManager.unregister(stateContext, 'array', truePredicate);
}