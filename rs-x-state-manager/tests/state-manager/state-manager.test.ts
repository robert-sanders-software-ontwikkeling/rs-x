import { BehaviorSubject, type Observable, of } from 'rxjs';

import {
  InjectionContainer,
  truePredicate,
  Type,
  WaitForEvent,
} from '@rs-x/core';
import { ObservableMock } from '@rs-x/core/testing';

import { type IArrayProxyFactory } from '../../lib/proxies/array-proxy/array-proxy.factory.type';
import { type IMapProxyFactory } from '../../lib/proxies/map-proxy/map-proxy.factory.type';
import { type IProxyRegistry } from '../../lib/proxies/proxy-registry/proxy-registry.interface';
import { RsXStateManagerModule } from '../../lib/rs-x-state-manager.module';
import { RsXStateManagerInjectionTokens } from '../../lib/rs-x-state-manager-injection-tokens';
import {
  type IStateChange,
  type IStateManager,
} from '../../lib/state-manager/state-manager.interface';
import { IndexWatchRuleMock } from '../../lib/testing/watch-index-rule.mock';

interface IPrivateIStateManager extends IStateManager {
  _changed: Observable<IStateChange>;
}

describe('StateManager tests', () => {
  let stateManager: IPrivateIStateManager;
  let _oldChange: Observable<IStateChange> | undefined;

  beforeAll(async () => {
    await InjectionContainer.load(RsXStateManagerModule);
    stateManager = InjectionContainer.get<IPrivateIStateManager>(
      RsXStateManagerInjectionTokens.IStateManager,
    );
  });

  afterAll(async () => {
    await InjectionContainer.unload(RsXStateManagerModule);
  });

  afterEach(() => {
    if (_oldChange) {
      stateManager._changed = _oldChange;
      _oldChange = undefined;
    }
    stateManager.clear();
  });

  it('Watching state first time will return undefined.', () => {
    const object = {
      x: 10,
    };

    const actual = stateManager.watchState(object, 'x');
    expect(actual).toBeUndefined();
  });

  it('If state is already watched it will return the current state.', () => {
    const object = {
      x: 10,
    };

    stateManager.watchState(object, 'x');
    const actual = stateManager.watchState(object, 'x');
    expect(actual).toEqual(10);
  });

  it('State will be release when reference count goes to zero.', () => {
    const object = {
      x: 10,
    };
    stateManager.watchState(object, 'x');
    stateManager.watchState(object, 'x');

    stateManager.releaseState(object, 'x');
    expect(stateManager.getState(object, 'x')).toEqual(10);

    stateManager.releaseState(object, 'x');
    expect(stateManager.getState(object, 'x')).toBeUndefined();
  });

  describe('Set state', () => {
    it('Set state', () => {
      const context = {};

      stateManager.setState(context, 'x', 10);

      const actual = stateManager.getState(context, 'x');
      expect(actual).toEqual(10);
    });

    it('Replacing unwatched state will emit changes for nested  states ', async () => {
      const context = {};
      const value = {
        x: 10,
        nested: {
          y: 20,
          z: 30,
        },
      };

      stateManager.setState(context, 'root', value);
      stateManager.watchState(value, 'x');
      stateManager.watchState(value, 'nested');
      stateManager.watchState(value.nested, 'y');
      stateManager.setState(value.nested, 'z', value.nested.z);

      const newValue = {
        x: 100,
        nested: {
          y: 200,
          z: 300,
        },
      };
      const actual = await new WaitForEvent(stateManager, 'changed', {
        count: 5,
      }).wait(() => {
        stateManager.setState(context, 'root', newValue);
      });

      const expected: IStateChange[] = [
        {
          context: newValue,
          oldContext: value,
          index: 'x',
          newValue: 100,
          oldValue: 10,
        },
        {
          context: newValue,
          oldContext: value,
          index: 'nested',
          newValue: { y: 200, z: 300 },
          oldValue: { y: 20, z: 30 },
        },
        {
          context: newValue.nested,
          oldContext: value.nested,
          index: 'y',
          newValue: 200,
          oldValue: 20,
        },
        {
          context: newValue.nested,
          oldContext: value.nested,
          index: 'z',
          newValue: 300,
          oldValue: 30,
        },
        {
          context,
          oldContext: context,
          index: 'root',
          newValue,
          oldValue: value,
        },
      ];

      expect(actual).toEqual(expected);
    });
  });

  describe('watch property of an object', () => {
    it('Watch will initialise state', () => {
      const object = {
        x: 10,
      };

      stateManager.watchState(object, 'x');

      expect(stateManager.getState(object, 'x')).toEqual(10);
    });

    it('When the state is watched, its initial value is emitted.', async () => {
      const object = {
        x: 10,
      };

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          stateManager.watchState(object, 'x');
        },
      );

      const expected: IStateChange = {
        context: object,
        oldContext: object,
        index: 'x',
        oldValue: undefined,
        newValue: 10,
      };
      expect(actual).toEqual(expected);
    });

    it('Setting a new value for a watched field will emit a change event.', async () => {
      const object = { x: 10 };
      stateManager.watchState(object, 'x');

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          object.x = 20;
        },
      );

      const expected: IStateChange = {
        context: object,
        oldContext: object,
        index: 'x',
        oldValue: 10,
        newValue: 20,
      };
      expect(actual).toEqual(expected);
    });

    it('Setting a new value for a field that is not watched will not emit a change event.', async () => {
      const object = { x: 10, y: 20 };
      stateManager.watchState(object, 'x');

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          object.y = 30;
        },
      );

      expect(actual).toBeNull();
    });

    it('State will be updated when belonging watched property changes.', async () => {
      const object = { x: 10 };
      stateManager.watchState(object, 'x');

      object.x = 20;

      expect(stateManager.getState(object, 'x')).toEqual(20);
    });
  });

  describe('Watch an item in an array', () => {
    let arrayProxyFactory: IArrayProxyFactory;

    beforeAll(() => {
      arrayProxyFactory = InjectionContainer.get<IArrayProxyFactory>(
        RsXStateManagerInjectionTokens.IArrayProxyFactory,
      );
    });

    it('Watch will initialise state', () => {
      const array = [1, 2];

      stateManager.watchState(array, 1);

      expect(stateManager.getState(array, 1)).toEqual(2);
    });

    it('When the state is watched, its initial value is emitted.', async () => {
      const array = [1, 2];

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          stateManager.watchState(array, 1);
        },
      );

      const expected: IStateChange = {
        context: array,
        oldContext: array,
        index: 1,
        oldValue: undefined,
        newValue: 2,
      };
      expect(actual).toEqual(expected);
    });

    it('Setting a new value for a watched index, will emit change event.', async () => {
      const array = [1, 2];
      stateManager.watchState(array, 1);

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          Type.cast<number[]>(
            arrayProxyFactory.getFromData({ array })?.proxy,
          )[1] = 20;
        },
      );

      const expected: IStateChange = {
        context: array,
        oldContext: array,
        index: 1,
        oldValue: 2,
        newValue: 20,
      };
      expect(actual).toEqual(expected);
    });

    it('Setting a new value for an index not watched, will not emit a change event.', async () => {
      const array = [1, 2];
      stateManager.watchState(array, 1);

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          Type.cast<number[]>(
            arrayProxyFactory.getFromData({ array })?.proxy,
          )[0] = 20;
        },
      );

      expect(actual).toBeNull();
    });

    it('State will be updated when belonging property changes.', async () => {
      const array = [1, 2];
      stateManager.watchState(array, 1);

      Type.cast<number[]>(arrayProxyFactory.getFromData({ array })?.proxy)[1] =
        20;

      expect(stateManager.getState(array, 1)).toEqual(20);
    });

    it('Setting array length to a value lesser or equal to watched index will emit a change event.', async () => {
      const array = [1, 2];
      stateManager.watchState(array, 1);

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          Type.cast<unknown[]>(
            arrayProxyFactory.getFromData({ array })?.proxy,
          ).length = 1;
        },
      );

      const expected: IStateChange = {
        context: array,
        oldContext: array,
        index: 1,
        oldValue: 2,
        newValue: undefined,
      };
      expect(actual).toEqual(expected);
    });

    it('A watched index will be unwatched when array length changes to a length lesser or equal to watched index', async () => {
      const array = [1, 2];

      stateManager.watchState(array, 0);
      stateManager.watchState(array, 1);

      expect(stateManager.getState(array, 1)).toEqual(2);
      expect(arrayProxyFactory.getFromData({ array })).toBeDefined();

      Type.cast<unknown[]>(
        arrayProxyFactory.getFromData({ array })?.proxy,
      ).length = 1;

      expect(stateManager.getState(array, 1)).toBeUndefined();
      expect(arrayProxyFactory.getFromData({ array })).toBeDefined();
    });
  });

  describe('Watch a key in a map', () => {
    let mapProxyFactory: IMapProxyFactory;

    beforeAll(() => {
      mapProxyFactory = InjectionContainer.get<IMapProxyFactory>(
        RsXStateManagerInjectionTokens.IMapProxyFactory,
      );
    });

    it('Watch will initialise state', () => {
      const map = new Map<string, number>([
        ['a', 1],
        ['b', 2],
      ]);

      stateManager.watchState(map, 'b');

      expect(stateManager.getState(map, 'b')).toEqual(2);
    });

    it('When the state is watched, its initial value is emitted.', async () => {
      const map = new Map<string, number>([
        ['a', 1],
        ['b', 2],
      ]);

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          stateManager.watchState(map, 'b');
        },
      );

      const expected: IStateChange = {
        context: map,
        oldContext: map,
        index: 'b',
        oldValue: undefined,
        newValue: 2,
      };
      expect(actual).toEqual(expected);
    });

    it('Setting a new value for a watched key will emit a change event.', async () => {
      const map = new Map<string, number>([
        ['a', 1],
        ['b', 2],
      ]);
      stateManager.watchState(map, 'b');

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          mapProxyFactory.getFromData({ map: map })?.proxy?.set('b', 20);
        },
      );

      const expected: IStateChange = {
        context: map,
        oldContext: map,
        index: 'b',
        oldValue: 2,
        newValue: 20,
      };
      expect(actual).toEqual(expected);
    });

    it('Setting a new value for an watched key will not emit change event', async () => {
      const map = new Map<string, number>([
        ['a', 1],
        ['b', 2],
      ]);
      stateManager.watchState(map, 'b');

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          mapProxyFactory.getFromData({ map: map })?.proxy?.set('a', 20);
        },
      );

      expect(actual).toBeNull();
    });

    it('State will be updated when belonging value for watched key changes', async () => {
      const map = new Map<string, number>([
        ['a', 1],
        ['b', 2],
      ]);
      stateManager.watchState(map, 'b');

      Type.cast<Map<string, number>>(
        mapProxyFactory.getFromData({ map })?.proxy,
      ).set('b', 20);

      expect(stateManager.getState(map, 'b')).toEqual(20);
    });

    it('Delete an watched item will emit a change event', async () => {
      const map = new Map<string, number>([
        ['a', 1],
        ['b', 2],
      ]);

      stateManager.watchState(map, 'b');

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          mapProxyFactory.getFromData({ map: map })?.proxy?.delete('b');
        },
      );

      const expected: IStateChange = {
        context: map,
        oldContext: map,
        index: 'b',
        oldValue: 2,
        newValue: undefined,
      };

      expect(actual).toEqual(expected);
    });
  });

  describe('Watch a date property', () => {
    let proxyRegistry: IProxyRegistry;

    beforeAll(() => {
      proxyRegistry = InjectionContainer.get(
        RsXStateManagerInjectionTokens.IProxyRegistry,
      );
    });

    it('Watch date property will initialise state', async () => {
      const date = new Date(2021, 2, 3);

      await new WaitForEvent(stateManager, 'changed').wait(() => {
        stateManager.watchState(date, 'year');
      });

      expect(stateManager.getState(date, 'year')).toEqual(2021);
    });

    it('When the state is watched, its initial value is emitted.', async () => {
      const date = new Date(2021, 2, 3);

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          stateManager.watchState(date, 'year');
        },
      );

      const expected: IStateChange = {
        context: date,
        oldContext: date,
        index: 'year',
        oldValue: undefined,
        newValue: 2021,
      };

      expect(actual).toEqual(expected);
    });

    it('Changing watched  property of type Date will not emit a change event if not recursive', async () => {
      const object = { x: new Date(2021, 2, 3) };

      await new WaitForEvent(stateManager, 'changed').wait(() => {
        stateManager.watchState(object, 'x');
      });

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          object.x.setFullYear(2024);
        },
      );

      expect(actual).toBeNull();
    });

    it('Changing watched date property will emit a change event if recursive', async () => {
      const object = { x: new Date(2021, 2, 3) };
      const indexWatchRule = new IndexWatchRuleMock(truePredicate);

      await new WaitForEvent(stateManager, 'changed').wait(() => {
        stateManager.watchState(object, 'x', indexWatchRule);
      });

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          object.x.setFullYear(2024);
        },
      );

      const expected: IStateChange = {
        context: object,
        oldContext: object,
        index: 'x',
        oldValue: new Date(2021, 2, 3),
        newValue: new Date(2024, 2, 3),
      };
      expect(actual).toDeepEqualCircular(expected);
    });

    it('Changing watched date property will emit a change event', async () => {
      const date = new Date(2021, 2, 3);

      stateManager.watchState(date, 'year');

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          const dataProxy = proxyRegistry.getProxy<Date>(date);
          dataProxy.setFullYear(2023);
        },
      );

      const expected: IStateChange = {
        context: date,
        oldContext: date,
        index: 'year',
        oldValue: 2021,
        newValue: 2023,
      };

      expect(actual).toEqual(expected);
    });
  });

  describe('Watch promise property', () => {
    it('Watch will initialise state', async () => {
      const object = { x: Promise.resolve(2) };

      await new WaitForEvent(stateManager, 'changed').wait(() => {
        stateManager.watchState(object, 'x');
      });

      expect(stateManager.getState(object, 'x')).toEqual(2);
    });

    it('When the state is watched, its initial value is emitted.', async () => {
      const object = { x: Promise.resolve(2) };

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          stateManager.watchState(object, 'x');
        },
      );

      const expected: IStateChange = {
        context: object,
        oldContext: object,
        index: 'x',
        oldValue: undefined,
        newValue: 2,
      };

      expect(actual).toEqual(expected);
    });

    it('Replacing watched promise property with null will emit change event', async () => {
      const object: { x: null | Promise<number> } = { x: Promise.resolve(2) };

      await new WaitForEvent(stateManager, 'changed').wait(() => {
        stateManager.watchState(object, 'x');
      });

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          object.x = null;
        },
      );

      const expected: IStateChange = {
        context: object,
        oldContext: object,
        index: 'x',
        oldValue: 2,
        newValue: null,
      };
      expect(actual).toEqual(expected);
    });

    it('Setting initial value from null to promise will emit a change event.', async () => {
      const object: { x: null | Promise<number> } = { x: null };
      await new WaitForEvent(stateManager, 'changed').wait(() => {
        stateManager.watchState(object, 'x');
      });

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          object.x = Promise.resolve(3);
        },
      );

      const expected: IStateChange = {
        context: object,
        oldContext: object,
        index: 'x',
        oldValue: null,
        newValue: 3,
      };
      expect(actual).toEqual(expected);
    });

    it('Replacing promise will emit a change event', async () => {
      const object = { x: Promise.resolve(2) };
      await new WaitForEvent(stateManager, 'changed').wait(() => {
        stateManager.watchState(object, 'x');
      });

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          object.x = Promise.resolve(3);
        },
      );

      const expected: IStateChange = {
        context: object,
        oldContext: object,
        index: 'x',
        oldValue: 2,
        newValue: 3,
      };

      expect(actual).toEqual(expected);
    });

    it('Replacing promise will update state', async () => {
      const object = { x: Promise.resolve(2) };

      await new WaitForEvent(stateManager, 'changed').wait(() => {
        stateManager.watchState(object, 'x');
      });

      await new WaitForEvent(stateManager, 'changed').wait(() => {
        object.x = Promise.resolve(3);
      });

      expect(stateManager.getState(object, 'x')).toEqual(3);
    });
  });

  describe('Watch observable property', () => {
    it('Watch will initialise state.', async () => {
      const object = { x: of(2) };

      await new WaitForEvent(stateManager, 'changed').wait(() => {
        stateManager.watchState(object, 'x');
      });

      expect(stateManager.getState(object, 'x')).toEqual(2);
    });

    it('When the state is watched, its initial value is emitted.', async () => {
      const object = { x: of(2) };

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          stateManager.watchState(object, 'x');
        },
      );

      const expected: IStateChange = {
        context: object,
        oldContext: object,
        index: 'x',
        oldValue: undefined,
        newValue: 2,
      };

      expect(actual).toEqual(expected);
    });

    it('Replacing observable property with null will emit a change event.', async () => {
      const object: { x: null | Observable<number> } = { x: of(2) };

      await new WaitForEvent(stateManager, 'changed').wait(() => {
        stateManager.watchState(object, 'x');
      });

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          object.x = null;
        },
      );

      const expected: IStateChange = {
        context: object,
        oldContext: object,
        index: 'x',
        oldValue: 2,
        newValue: null,
      };

      expect(actual).toEqual(expected);
    });

    it('Setting initial value from null to a observable will emit a change event.', async () => {
      const object: { x: null | Observable<number> } = { x: null };

      await new WaitForEvent(stateManager, 'changed').wait(() => {
        stateManager.watchState(object, 'x');
      });

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          object.x = of(3);
        },
      );

      const expected: IStateChange = {
        context: object,
        oldContext: object,
        index: 'x',
        oldValue: null,
        newValue: 3,
      };
      expect(actual).toEqual(expected);
    });

    it('Replacing observable will emit a change event', async () => {
      const object = { x: of(2) };
      await new WaitForEvent(stateManager, 'changed').wait(() => {
        stateManager.watchState(object, 'x');
      });

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          object.x = of(3);
        },
      );

      const expected: IStateChange = {
        context: object,
        oldContext: object,
        index: 'x',
        oldValue: 2,
        newValue: 3,
      };
      expect(actual).toEqual(expected);
    });

    it('Replacing observable will update state.', async () => {
      const object = { x: of(2) };

      await new WaitForEvent(stateManager, 'changed').wait(() => {
        stateManager.watchState(object, 'x');
      });

      await new WaitForEvent(stateManager, 'changed').wait(() => {
        object.x = of(3);
      });

      expect(stateManager.getState(object, 'x')).toEqual(3);
    });

    it('Will emit a change event when observable emits a new value.', async () => {
      const object = { x: new BehaviorSubject(2) };
      stateManager.watchState(object, 'x');

      const actual = await new WaitForEvent(stateManager, 'changed').wait(
        () => {
          object.x.next(3);
        },
      );

      const expected: IStateChange = {
        context: object,
        oldContext: object,
        index: 'x',
        oldValue: 2,
        newValue: 3,
      };

      expect(actual).toEqual(expected);
    });

    it('Will update state when observable emits a new value', async () => {
      const object = { x: new BehaviorSubject(2) };
      stateManager.watchState(object, 'x');

      await new WaitForEvent(stateManager, 'changed').wait(() => {
        object.x.next(3);
      });

      expect(stateManager.getState(object, 'x')).toEqual(3);
    });
  });

  describe('Updating nested state', () => {
    it('Replacing root state will emit a change event for all changed  states', async () => {
      const object = {
        nested: {
          value: 2,
          nested: {
            value: 3,
          },
        },
      };

      const indexWatchRuleNested1 = new IndexWatchRuleMock(
        (index, target) => index === 'nested' && target === object,
      );

      const indexWatchRuleValue1 = new IndexWatchRuleMock(
        (index, target) => index === 'value' && target === object.nested,
      );

      const indexWatchRuleNested2 = new IndexWatchRuleMock(
        (index, target) => index === 'nested' && target === object.nested,
      );
      const indexWatchRuleNested2Recursive = new IndexWatchRuleMock(
        truePredicate,
      );
      const indexWatchRuleValue2 = new IndexWatchRuleMock(
        (index, target) => index === 'value' && target === object.nested.nested,
      );

      stateManager.watchState(object, 'nested', indexWatchRuleNested1);

      stateManager.watchState(object.nested, 'value', indexWatchRuleValue1);
      stateManager.watchState(object.nested, 'nested', indexWatchRuleNested2);
      stateManager.watchState(
        object.nested,
        'nested',
        indexWatchRuleNested2Recursive,
      );
      stateManager.watchState(
        object.nested.nested,
        'value',
        indexWatchRuleValue2,
      );

      const actual = await new WaitForEvent(stateManager, 'changed', {
        count: 3,
      }).wait(() => {
        object.nested = {
          value: 2,
          nested: {
            value: 13,
          },
        };
      });

      const expected: IStateChange[] = [
        {
          oldContext: {
            value: 2,
            nested: {
              value: 3,
            },
          },
          context: {
            value: 2,
            nested: {
              value: 13,
            },
          },
          index: 'nested',
          oldValue: {
            value: 3,
          },
          newValue: {
            value: 13,
          },
        },
        {
          oldContext: {
            value: 3,
          },
          context: {
            value: 13,
          },
          index: 'value',
          oldValue: 3,
          newValue: 13,
        },
        {
          oldContext: {
            nested: {
              value: 2,
              nested: {
                value: 13,
              },
            },
          },
          context: {
            nested: {
              value: 2,
              nested: {
                value: 13,
              },
            },
          },
          index: 'nested',
          oldValue: {
            value: 2,
            nested: {
              value: 3,
            },
          },
          newValue: {
            value: 2,
            nested: {
              value: 13,
            },
          },
        },
      ];
      expect(actual).toEqual(expected);
    });
    it('Replacing root state will update all registered nested states.', async () => {
      const object = {
        nested: {
          value: 2,
          nested: {
            value: 3,
          },
        },
      };

      stateManager.watchState(object, 'nested');
      stateManager.watchState(object.nested, 'value');
      stateManager.watchState(object.nested, 'nested');
      stateManager.watchState(object.nested.nested, 'value');

      await new WaitForEvent(stateManager, 'changed', {
        count: 4,
      }).wait(() => {
        object.nested = {
          value: 12,
          nested: {
            value: 13,
          },
        };
      });

      expect(stateManager.getState(object, 'nested')).toEqual({
        value: 12,
        nested: {
          value: 13,
        },
      });

      expect(stateManager.getState(object.nested, 'value')).toEqual(12);

      expect(stateManager.getState(object.nested, 'nested')).toEqual({
        value: 13,
      });

      expect(stateManager.getState(object.nested.nested, 'value')).toEqual(13);
    });

    it('Replacing nested object will emit a correct number of change events', async () => {
      const oldContext = {
        value: 2,
        nested: {
          value: 3,
        },
      };
      const object = {
        nested: oldContext,
      };
      stateManager.watchState(object, 'nested');
      stateManager.watchState(object.nested, 'value');
      stateManager.watchState(object.nested, 'nested');
      stateManager.watchState(object.nested.nested, 'value');
      const changed = new ObservableMock();
      stateManager._changed = changed;

      await new WaitForEvent(stateManager, 'changed', { count: 4 }).wait(() => {
        object.nested = {
          value: 12,
          nested: {
            value: 13,
          },
        };
      });

      expect(changed.next).toHaveBeenCalledTimes(4);
    });

    it('Replacing nested object will emit a change event fo every change', async () => {
      const oldContext = {
        value: 2,
        nested: {
          value: 3,
        },
      };
      const object = {
        nested: oldContext,
      };
      stateManager.watchState(object, 'nested');
      stateManager.watchState(object.nested, 'value');
      stateManager.watchState(object.nested, 'nested');
      stateManager.watchState(object.nested.nested, 'value');
      const newContext = {
        value: 12,
        nested: {
          value: 13,
        },
      };

      const actual = (await new WaitForEvent(stateManager, 'changed', {
        count: 4,
      }).wait(() => {
        object.nested = newContext;
      })) as IStateChange[];

      const expected = [
        {
          context: newContext,
          oldContext,
          index: 'value',
          oldValue: oldContext.value,
          newValue: newContext.value,
        },
        {
          context: newContext,
          oldContext,
          index: 'nested',
          oldValue: oldContext.nested,
          newValue: newContext.nested,
        },
        {
          context: newContext.nested,
          oldContext: oldContext.nested,
          index: 'value',
          oldValue: oldContext.nested.value,
          newValue: newContext.nested.value,
        },
        {
          context: object,
          oldContext: object,
          index: 'nested',
          oldValue: oldContext,
          newValue: newContext,
        },
      ];

      expect(actual[0]).toEqual(expected[0]);
      expect(actual[1]).toEqual(expected[1]);
      expect(actual[2]).toEqual(expected[2]);
      expect(actual[3]).toEqual(expected[3]);
      expect(actual).toEqual(expected);
    });
  });

  it('When changing a nested state a change event will be also emitted for registed parent states.', async () => {
    const object = {
      nested: {
        value: 2,
        nested: {
          value: 3,
        },
      },
    };

    const indexWatchRule = new IndexWatchRuleMock(truePredicate);

    stateManager.watchState(object, 'nested', indexWatchRule);
    stateManager.watchState(object.nested.nested, 'value');

    const actual = await new WaitForEvent(stateManager, 'changed', {
      count: 2,
    }).wait(() => {
      object.nested.nested.value = 13;
    });

    const expected = [
      {
        context: object,
        oldContext: object,
        index: 'nested',
        oldValue: {
          value: 2,
          nested: {
            value: 3,
          },
        },
        newValue: {
          value: 2,
          nested: {
            value: 13,
          },
        },
      },
      {
        context: object.nested.nested,
        oldContext: object.nested.nested,
        index: 'value',
        oldValue: 3,
        newValue: 13,
      },
    ];
    expect(actual).toEqual(expected);
  });
});
