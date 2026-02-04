import { InjectionContainer, printValue } from '@rs-x/core';
import {
  type IStateChange,
  type IStateManager,
  RsXStateManagerInjectionTokens,
  RsXStateManagerModule,
  watchIndexRecursiveRule,
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

export const run = (() => {
  const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager,
  );

  const model = {
    array: [
      [1, 2],
      [3, 4],
    ],
  };

  const changeSubscription = stateManager.changed.subscribe(
    (change: IStateChange) => {
      printValue(change.newValue);
    },
  );

  try {
    // This will emit a change event with the initial (current) value.
    console.log('Initial value:');
    stateManager.watchState(model, 'array', watchIndexRecursiveRule);

    console.log('Changed value:');
    model.array[1].push(5);

    console.log('Latest value:');
    printValue(stateManager.getState(model, 'array'));
  } finally {
    changeSubscription.unsubscribe();
    // Always release the state when it is no longer needed.
    stateManager.releaseState(model, 'array', watchIndexRecursiveRule);
  }
})();
