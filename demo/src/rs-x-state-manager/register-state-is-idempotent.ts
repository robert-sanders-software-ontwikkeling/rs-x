import { InjectionContainer } from '@rs-x/core';
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
    x: { y: 10 }
};

stateManager.changed.subscribe((change: IStateChange) => {
   printValue(change.newValue);
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
console.log('---');
stateContext.x = { y: 30 };