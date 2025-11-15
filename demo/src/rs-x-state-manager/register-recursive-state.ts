import { InjectionContainer, truePredicate } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';


InjectionContainer.load(RsXStateManagerModule);

const stateContext = {
    x: { y: 10 }
};

const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager
);

console.log('Initial value:');
stateManager.changed.subscribe((change: IStateChange) => {
    console.log(structuredClone(change.newValue));
});

// We register recursive state by passing in
// a predicate as the third argument.
// This will emit an initial value { y: 10 }
stateManager.register(stateContext, 'x', truePredicate);


console.log('Changed value:');
// This will emit the new value { y: 10 }
stateContext.x = {
    y: 20
};

console.log('Changed (recursive) value:');
// This will emit the new value { y: 30 } because x 
// is registered as a recursive state.
stateContext.x.y = 30;