import { InjectionContainer } from '@rs-x/core';
import {
    IStateChange,
    IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';

InjectionContainer.load(RsXStateManagerModule);

const stateContext = {
    x: 10
};

const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager
);

stateManager.changed.subscribe((change: IStateChange) => {
    console.log(change.newValue);
});

// This will emit a initial value 10
stateManager.register(stateContext, 'x');

// This will emit new value 20
stateContext.x = 20;

