import { InjectionContainer, printValue, Type } from '@rs-x/core';
import {
  type IStateChange,
  type IStateManager,
  RsXStateManagerInjectionTokens,
  RsXStateManagerModule,
  watchIndexRecursiveRule,
} from '@rs-x/state-manager';

// Load the state manager module into the injection container
InjectionContainer.load(RsXStateManagerModule);

interface INestStateConext {
  a: number;
  nested?: INestStateConext;
}

class MyModel {
  private _b: INestStateConext = {
    a: 10,
    nested: {
      a: 20,
      nested: {
        a: 30,
        nested: {
          a: 40,
        },
      },
    },
  };

  public get b(): INestStateConext {
    return this._b;
  }

  public set b(value: INestStateConext) {
    this._b = value;
  }
}

export const run = (() => {
  const stateManager: IStateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager,
  );

  const model = new MyModel();

  const changeSubscription = stateManager.changed.subscribe(
    (change: IStateChange) => {
      printValue(change.newValue);
    },
  );

  try {
    // Observe property `b` recursively.
    // Otherwise, only assigning a new value to model.b would emit a change event.
    // This will emit a change event with the initial (current) value.
    console.log('Initial value:');
    stateManager.watchState(model, 'b', watchIndexRecursiveRule);

    console.log('\nReplacing model.b.nested.nested will emit a change event');
    console.log('Changed value:');

    (Type.toObject(model.b.nested) ?? {}).nested = {
      a: -30,
      nested: {
        a: -40,
      },
    };

    console.log(`Latest value:`);
    printValue(stateManager.getState(model, 'b'));
  } finally {
    changeSubscription.unsubscribe();
    // Always release the state when it is no longer needed.
    stateManager.releaseState(model, 'b', watchIndexRecursiveRule);
  }
})();
