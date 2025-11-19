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

interface INestStateConext {
    a: number;
    nested?: INestStateConext;
}

class StateContext {
    private _b: INestStateConext = {
        a: 10,
        nested: {
            a: 20,
            nested: {
                a: 30,
                nested: {
                    a: 40
                }
            }
        }
    };

    public get b(): INestStateConext {
        return this._b;
    }

    public set b(value: INestStateConext) {
        this._b = value;
    }
}

const stateContext = new StateContext();

const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
    printValue(change.newValue);
});

try {
    // Observe property `b` recursively.
    // Otherwise, only assigning a new value to stateContext.b would emit a change event.
    // This will emit a change event with the initial (current) value.
    console.log('Initial value:');
    stateManager.register(stateContext, 'b', truePredicate);

    console.log('\nReplacing stateContext.b.nested.nested will emit a change event');
    console.log('Changed value:');

    stateContext.b.nested.nested = {
        a: -30,
        nested: {
            a: -40
        }
    };

     console.log(`Latest value:`);
     printValue(stateManager.getState(stateContext, 'b'));

} finally {
    changeSubscription.unsubscribe();
    stateManager.unregister(stateContext, 'b', truePredicate);
}