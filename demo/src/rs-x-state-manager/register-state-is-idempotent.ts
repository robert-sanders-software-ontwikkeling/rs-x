import { InjectionContainer, printValue } from '@rs-x/core';
import {
  type IStateChange,
  type IStateManager,
  RsXStateManagerInjectionTokens,
  RsXStateManagerModule,
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

export const run = (() => {
  const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager,
  );
  const model = {
    x: { y: 10 },
  };
  const changedSubscription = stateManager.changed.subscribe(
    (change: IStateChange) => {
      printValue(change.newValue);
    },
  );

  try {
    // Register is idempotent: you can register the same state multiple times.
    // For every register call, make sure you call unregister when you're done.
    console.log('Initial value:');
    stateManager.watchState(model, 'x');
    stateManager.watchState(model, 'x');

    console.log('Changed value:');
    model.x = { y: 20 };

    stateManager.releaseState(model, 'x');

    console.log(
      'Changed event is still emitted after unregister because one observer remains.',
    );
    console.log('Changed value:');
    model.x = { y: 30 };

    stateManager.releaseState(model, 'x');

    console.log(
      'Changed event is no longer emitted after the last observer unregisters.',
    );
    console.log('Changed value:');
    console.log('---');
    model.x = { y: 30 };
  } finally {
    changedSubscription.unsubscribe();
  }
})();
