import { InjectionContainer, truePredicate } from '@rs-x/core';
import {
    IProxyRegistry,
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

function printSet(set: Set<number[]>): void {
    console.log(JSON.stringify(Array.from(set.values()), null, 4).replaceAll('"', ''));
}

const item1 = [1, 2];
const item2 = [3, 4];
const stateContext = {
    set: new Set([item1, item2])
};

const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
    printSet(change.newValue as Set<number[]>);
});

try {
    // Otherwise, only assigning a new value to stateContext.map would emit a change event.
    // This will emit a change event with the initial (current) value.
    console.log('Initial value:');

    stateManager.register(stateContext, 'set', truePredicate);

    console.log('Changed value:');

    const proxyRegister: IProxyRegistry = InjectionContainer.get(RsXStateManagerInjectionTokens.IProxyRegistry);
    proxyRegister.getProxy<number[]>(item2).push(5);
   

    console.log('Latest value:');
    printSet(stateManager.getState(stateContext,'set') as Set<number[]>);

} finally {
    changeSubscription.unsubscribe();
    stateManager.unregister(stateContext, 'array', truePredicate);
}