    import { InjectionContainer } from '@rs-x/core';
    import {
        IStateChange,
        IStateManager,
        RsXStateManagerInjectionTokens,
        RsXStateManagerModule
    } from '@rs-x/state-manager';


    InjectionContainer.load(RsXStateManagerModule);

    const stateContext = {
        x: {y: 10}
    };

    const stateManager: IStateManager = InjectionContainer.get(
        RsXStateManagerInjectionTokens.IStateManager
    );

    console.log('Initial value:');
    stateManager.changed.subscribe((change: IStateChange) => {
        console.log(change.newValue);
        console.log('\n');
    });

    // This will emit the new value { y: 10 }
    stateManager.register(stateContext, 'x');


    console.log('Changed value:');
    // This will emit the new value { y: 10 }
    stateContext.x = {
        y:20
    };

    // This will emit no change because the state is not recursive.
    stateContext.x.y = 30