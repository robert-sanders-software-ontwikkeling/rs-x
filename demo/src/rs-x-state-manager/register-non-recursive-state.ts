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

  // This will emit a change event with the initial (current) value.
  console.log('Initial value:');
  const changedSubsription = stateManager.changed.subscribe(
    (change: IStateChange) => {
      printValue(change.newValue);
    },
  );

  try {
    // This will emit the new value { y: 10 }
    stateManager.watchState(model, 'x');

    console.log('Changed value:');
    // This will emit the new value { y: 10 }
    model.x = {
      y: 20,
    };

    console.log(`Latest value:`);
    printValue(stateManager.getState(model, 'x'));

    // This will emit no change because the state is not recursive.
    console.log('\nmodel.x.y = 30 will not emit any change:\n---\n');
    model.x.y = 30;
  } finally {
    changedSubsription.unsubscribe();
    // Always release the state when it is no longer needed.
    stateManager.releaseState(model, 'x');
  }
})();
