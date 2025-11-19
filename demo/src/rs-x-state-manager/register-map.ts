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

function printMap(map: Map<string, number[]>): void {
    console.log(JSON.stringify(Array.from(map.entries()), null, 4).replaceAll('"', ''));
}

const stateContext = {
    map: new Map([
        ['a', [1, 2]],
        ['b', [3, 4]]
    ])
};

const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
    printMap(change.newValue as Map<string, number[]>);
});

try {
    // Otherwise, only assigning a new value to stateContext.map would emit a change event.
    // This will emit a change event with the initial (current) value.
    console.log('Initial value:');

    stateManager.register(stateContext, 'map', truePredicate);

    console.log('Changed value:');
    stateContext.map.get('b').push(5);

    console.log('Latest value:');
    printMap(stateManager.getState(stateContext,'map') as Map<string, number[]>);

} finally {
    changeSubscription.unsubscribe();
    stateManager.unregister(stateContext, 'array', truePredicate);
}