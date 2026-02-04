import { InjectionContainer, utCDate } from '@rs-x/core';
import {
  type IProxyRegistry,
  type IStateChange,
  type IStateManager,
  RsXStateManagerInjectionTokens,
  RsXStateManagerModule,
  watchIndexRecursiveRule,
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

function watchDate(stateManager: IStateManager) {
  console.log('\n******************************************');
  console.log('* Watching date');
  console.log('******************************************\n');

  const model = {
    date: utCDate(2021, 2, 5),
  };
  const changeSubscription = stateManager.changed.subscribe(
    (change: IStateChange) => {
      console.log(
        `${change.index}: ${(change.newValue as Date).toUTCString()}`,
      );
    },
  );
  try {
    console.log('Initial value:');
    stateManager.watchState(model, 'date', watchIndexRecursiveRule);

    console.log('Changed value:');
    model.date.setFullYear(2023);

    console.log('Set value:');
    model.date = new Date(2024, 5, 6);

    console.log('Latest value:');
    console.log(stateManager.getState<Date>(model, 'date').toUTCString());
  } finally {
    changeSubscription.unsubscribe();
    // Always release the state when it is no longer needed.
    stateManager.releaseState(model, 'date', watchIndexRecursiveRule);
  }
}

function watchDateProperty(stateManager: IStateManager) {
  console.log('\n******************************************');
  console.log('* Watching year');
  console.log('******************************************\n');
  const date = utCDate(2021, 2, 5);
  const changeSubscription = stateManager.changed.subscribe(
    (change: IStateChange) => {
      console.log(change.newValue);
    },
  );
  try {
    // This will emit a change event with the initial (current) value.
    console.log('Initial value:');
    stateManager.watchState(date, 'year');

    const proxyRegister: IProxyRegistry = InjectionContainer.get(
      RsXStateManagerInjectionTokens.IProxyRegistry,
    );
    const dateProxy = proxyRegister.getProxy<Date>(date);
    console.log('Changed value:');
    dateProxy.setFullYear(2023);

    console.log('Latest value:');
    console.log(stateManager.getState(date, 'year'));
  } finally {
    changeSubscription.unsubscribe();
    stateManager.releaseState(date, 'year');
  }
}

export const run = (() => {
  const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager,
  );
  watchDate(stateManager);
  watchDateProperty(stateManager);
})();
