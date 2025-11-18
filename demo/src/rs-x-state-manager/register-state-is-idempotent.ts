import { InjectionContainer } from '@rs-x/core';
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

stateManager.changed.subscribe((change: IStateChange) => {
    console.log(structuredClone(change.newValue));
    console.log('\n');
});

// Register is idempotent: you can register the same state multiple times.
// For every register call, make sure you call unregister when you're done.
console.log('Initial value:');
stateManager.register(stateContext, 'x');
stateManager.register(stateContext, 'x');

console.log('Changed value:');
stateContext.x = { y: 20 };

stateManager.unregister(stateContext, 'x');

console.log('Changed event is still emitted after unregister because one observer remains.');
console.log('Changed value:');
stateContext.x = { y: 30 };

stateManager.unregister(stateContext, 'x');

console.log('Changed event is no longer emitted after the last observer unregisters.');
console.log('Changed value:');
console.log('-');
stateContext.x = { y: 30 };
