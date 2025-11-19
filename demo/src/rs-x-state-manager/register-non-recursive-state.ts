import { InjectionContainer } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';


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


console.log('Initial value:');
stateManager.changed.subscribe((change: IStateChange) => {
    printValue(change.newValue);
});

// This will emit the new value { y: 10 }
stateManager.register(stateContext, 'x');


console.log('Changed value:');
// This will emit the new value { y: 10 }
stateContext.x = {
    y: 20
};

console.log(`Latest value:`);
printValue(stateManager.getState(stateContext, 'x'));

// This will emit no change because the state is not recursive.
console.log('\nstateContext.x.y = 30 will not emit any change:\n---\n');
stateContext.x.y = 30;
