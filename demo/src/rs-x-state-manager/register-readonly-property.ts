import { InjectionContainer, printValue } from '@rs-x/core';
import {
    type IStateChange,
    type IStateManager,
    RsXStateManagerInjectionTokens,
    RsXStateManagerModule
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

export const run = (() => {
    const stateManager: IStateManager = InjectionContainer.get(
        RsXStateManagerInjectionTokens.IStateManager
    );

    class StateContext {
        private readonly _aPlusBId = 'a+b';
        private _a = 10;
        private _b = 20;

        constructor() {
            this.setAPlusB();
        }

        public dispose(): void {
            return stateManager.releaseState(this, this._aPlusBId);
        }

        public get aPlusB(): number {
            return stateManager.getState(this, this._aPlusBId);
        }

        public get a(): number {
            return this._a;
        }

        public set a(value: number) {
            this._a = value;
            this.setAPlusB();
        }

        public get b(): number {
            return this._b;
        }

        public set b(value: number) {
            this._b = value;
            this.setAPlusB();
        }

        private setAPlusB(): void {
            stateManager.setState(this, this._aPlusBId, this._a + this._b);
        }
    }

    const stateContext = new StateContext();
    const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        printValue(change.newValue);
    });

    try {
        console.log(`Initial value for readonly property 'aPlusB':`);
        console.log(stateContext.aPlusB);

        console.log(`set 'stateContext.a' to '100' will emit a change event for readonly property 'aPlusB'`);
        console.log(`Changed value for readonly property 'aPlusB':`);
        stateContext.a = 100;

        console.log(`set 'stateContext.b' to '200' will emit a change event for readonly property 'aPlusB'`);
        console.log(`Changed value for readonly property 'aPlusB':`);
        stateContext.b = 200;

    } finally {
        changeSubscription.unsubscribe();
        // Always release the state when it is no longer needed.
        stateContext.dispose();
    }
})();