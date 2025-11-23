import { InjectionContainer, truePredicate, utCDate } from '@rs-x/core';
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



function watchDate() {
    console.log('\n******************************************');
    console.log('* Watching date');
    console.log('******************************************\n');

    const stateContext = {
        date: utCDate(2021, 2, 5)
    };
    const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        console.log(`${change.key}: ${(change.newValue as Date).toUTCString()}`);
    });
    try {
        console.log('Initial value:');
        stateManager.register(stateContext, 'date', truePredicate);

        console.log('Changed value:');
        stateContext.date.setFullYear(2023);

        console.log('Set value:');
        stateContext.date = new Date(2024, 5, 6);

        console.log('Latest value:');
        console.log(stateManager.getState<Date>(stateContext, 'date').toUTCString());


    } finally {
        changeSubscription.unsubscribe();
        stateManager.unregister(stateContext, 'date', truePredicate);
    }
}

function watchDateProperty() {
    console.log('\n******************************************');
    console.log('* Watching year');
    console.log('******************************************\n');
    const date = utCDate(2021, 2, 5);
    const changeSubscription = stateManager.changed.subscribe((change: IStateChange) => {
        console.log(change.newValue);
    });
    try {
        console.log('Initial value:');
        stateManager.register(date, 'year');

        const proxyRegister: IProxyRegistry = InjectionContainer.get(RsXStateManagerInjectionTokens.IProxyRegistry);
        const dateProxy = proxyRegister.getProxy<Date>(date);
        console.log('Changed value:');
        dateProxy.setFullYear(2023);

        console.log('Latest value:');
        console.log(stateManager.getState(date, 'year'));

    } finally {
        changeSubscription.unsubscribe();
        stateManager.unregister(date, 'year');
    }
}

watchDate();
watchDateProperty();