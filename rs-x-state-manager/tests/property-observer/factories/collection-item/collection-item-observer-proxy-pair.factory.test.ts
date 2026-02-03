import {
  InjectionContainer,
  type IPropertyChange,
  Type,
  WaitForEvent,
} from '@rs-x/core';
import { DisposableOwnerMock } from '@rs-x/core/testing';

import { type IObserver } from '../../../../lib/observer.interface';
import { type ICollectionItemObserverProxyPairFactory } from '../../../../lib/property-observer/factories/collection-item/collection-item-observer-proxy-pair.factory.type';
import { type IProxyRegistry } from '../../../../lib/proxies/proxy-registry/proxy-registry.interface';
import { RsXStateManagerModule } from '../../../../lib/rs-x-state-manager.module';
import { RsXStateManagerInjectionTokens } from '../../../../lib/rs-x-state-manager-injection-tokens';
import { IndexWatchRuleMock } from '../../../../lib/testing/watch-index-rule.mock';

describe('CollectionItemObserverProxyPairFactory tests', () => {
  let observer1: IObserver | undefined;
  let observer2: IObserver | undefined;
  let proxyRegister: IProxyRegistry;
  let collectionItemObserverProxyPairFactory: ICollectionItemObserverProxyPairFactory;
  let disposableOwner: DisposableOwnerMock;
  let indexWatchRule: IndexWatchRuleMock;

  beforeAll(async () => {
    await InjectionContainer.load(RsXStateManagerModule);
    collectionItemObserverProxyPairFactory = InjectionContainer.get(
      RsXStateManagerInjectionTokens.ICollectionItemObserverProxyPairFactory,
    );

    proxyRegister = InjectionContainer.get(
      RsXStateManagerInjectionTokens.IProxyRegistry,
    );
    disposableOwner = new DisposableOwnerMock();
  });

  afterAll(async () => {
    await InjectionContainer.unload(RsXStateManagerModule);
  });

  beforeEach(() => {
    indexWatchRule = new IndexWatchRuleMock();
    indexWatchRule.test.mockReturnValue(true);
  });

  afterEach(() => {
    if (observer1) {
      observer1.dispose();
      observer1 = undefined;
    }

    if (observer2) {
      observer2.dispose();
      observer2 = undefined;
    }
    indexWatchRule = new IndexWatchRuleMock();
  });

  describe('Array', () => {
    it('Will observe the item at the given key for a recursive observer.', async () => {
      const nestedArray1 = [];
      const nestedArray2 = [];
      const array = [nestedArray1, nestedArray2];

      observer1 = collectionItemObserverProxyPairFactory.create(
        disposableOwner,
        array,
        {
          index: 1,
          indexWatchRule,
        },
      ).observer;

      expect(proxyRegister.getProxy(nestedArray1)).toBeUndefined();
      expect(proxyRegister.getProxy(nestedArray2)).toBeDefined();

      expect(array[0]).toBe(nestedArray1);
      expect(array[1]).toBe(proxyRegister.getProxy(nestedArray2));
    });

    it('A non-recursive observer will not observe the item at the given key.', async () => {
      const nestedArray = [];
      const array = [nestedArray];

      observer1 = collectionItemObserverProxyPairFactory.create(
        disposableOwner,
        array,
        { index: 0 },
      ).observer;

      expect(proxyRegister.getProxy(nestedArray)).toBeUndefined();
      expect(array[0]).toBe(nestedArray);
    });

    describe('Mix non-recursive and recursive observers', () => {
      it('Change event for recursive observer will be emmited when changing root item', async () => {
        const nestedArray = [];
        const array = [nestedArray];

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          array,
          { index: 0 },
        ).observer;

        observer2 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          array,
          {
            index: 0,
            indexWatchRule,
          },
        ).observer;

        const newValue = [[11]];
        const actual = await new WaitForEvent(observer2, 'changed').wait(() => {
          const arrayProxy = proxyRegister.getProxy<unknown[]>(array);
          arrayProxy[0] = newValue;
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [{ context: array, index: 0 }],
          target: array,
          index: 0,
          newValue: newValue,
        };
        expect(actual).toDeepEqualCircular(expected);
      });

      it('Change event for non-recursived observer will be emmited when changing root item', async () => {
        const nestedArray = [];
        const array = [nestedArray];

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          array,
          { index: 0 },
        ).observer;

        observer2 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          array,
          {
            index: 0,
            indexWatchRule,
          },
        ).observer;

        const newValue = [[11]];
        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          const arrayProxy = proxyRegister.getProxy<unknown[]>(array);
          arrayProxy[0] = newValue;
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [{ context: array, index: 0 }],
          target: array,
          index: 0,
          newValue: newValue,
        };
        expect(actual).toDeepEqualCircular(expected);
      });

      it('No change event for non-recursived observer will be emmited when changing nested item', async () => {
        const array: number[][] = [[]];

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          array,
          { index: 0 },
        ).observer;

        observer2 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          array,
          {
            index: 0,
            indexWatchRule,
          },
        ).observer;

        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          array[0].push(20);
        });
        expect(actual).toBeNull();
      });

      it('Change event for recursived observer will be emmited when changing nested item', async () => {
        const nestedArray = [1];
        const array = [nestedArray];

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          array,
          { index: 0 },
        ).observer;

        observer2 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          array,
          {
            index: 0,
            indexWatchRule,
          },
        ).observer;

        const actual = await new WaitForEvent(observer2, 'changed').wait(() => {
          array[0].push(20);
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [
            { context: array, index: 0 },
            { context: nestedArray, index: 1 },
          ],
          target: nestedArray,
          index: 1,
          newValue: 20,
        };
        expect(actual).toDeepEqualCircular(expected);
      });
    });

    describe('Change events', () => {
      it('Will emit change when replacing value at a observed key', async () => {
        const array = [1, 2];
        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          array,
          { index: 0 },
        ).observer;

        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          const arrayProxy = proxyRegister.getProxy<number[]>(array);
          arrayProxy[0] = 10;
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [{ context: array, index: 0 }],
          target: array,
          index: 0,
          newValue: 10,
        };
        expect(actual).toEqual(expected);
      });

      it('Will not emit a change event when replacing the value at an unobserved key.', async () => {
        const array = [1, 2];

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          array,
          { index: 0 },
        ).observer;

        const arrayProxy = proxyRegister.getProxy<number[]>(array);

        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          arrayProxy[1] = 20;
        });

        expect(actual).toBeNull();
      });

      it('Will emit a change event when deleting an nested item for an recursive observed array.', async () => {
        const nestedArray = [1, 2];
        const array = [nestedArray];

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          array,
          {
            index: 0,
            indexWatchRule,
          },
        ).observer;

        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          array[0].pop();
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [
            { context: array, index: 0 },
            { context: nestedArray, index: 1 },
          ],
          target: nestedArray,
          index: 1,
          newValue: undefined,
        };
        expect(actual).toDeepEqualCircular(expected);
      });

      it('Will emit a change event when replacing an observed nested item for a recursive observer.', async () => {
        const nestedArray = [10];
        const array = [nestedArray];

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          array,
          {
            index: 0,
            indexWatchRule,
          },
        ).observer;

        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          array[0].push(20);
        });

        const expected: IPropertyChange = {
          arguments: [],
          target: nestedArray,
          chain: [
            { context: array, index: 0 },
            { context: nestedArray, index: 1 },
          ],
          index: 1,
          newValue: 20,
        };
        expect(actual).toDeepEqualCircular(expected);
      });

      it('Will emit a change event when changing an observed nested item for a recursive observer.', async () => {
        const nestedArray = [{ x: 1 }];
        const array = [nestedArray];

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          array,
          {
            index: 0,
            indexWatchRule,
          },
        ).observer;

        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          array[0][0].x = 100;
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [
            { context: array, index: 0 },
            { context: nestedArray, index: 0 },
            { context: nestedArray[0], index: 'x' },
          ],
          target: nestedArray[0],
          index: 'x',
          newValue: 100,
        };
        expect(actual).toDeepEqualCircular(expected);
      });

      it('Will not emit change when replacing value at a observed key with the same value.', async () => {
        const array = [1];
        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          array,
          { index: 0 },
        ).observer;
        const arrayProxy = proxyRegister.getProxy<number[]>(array);

        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          arrayProxy[0] = 1;
        });

        expect(actual).toBeNull();
      });
    });
  });

  describe('Map', () => {
    it('Will observe the item at the given key for a recursive observer.', async () => {
      const nestedMap = new Map();
      const map = new Map([['a', nestedMap]]);

      observer1 = collectionItemObserverProxyPairFactory.create(
        disposableOwner,
        map,
        {
          index: 'a',
          indexWatchRule,
        },
      ).observer;

      expect(map.get('a')).toBe(proxyRegister.getProxy(nestedMap));
    });

    it('A non-recursive observer will not observe the item at the given key.', async () => {
      const nestedMap = new Map();
      const map = new Map([
        ['a', new Map()],
        ['b', nestedMap],
      ]);

      observer1 = collectionItemObserverProxyPairFactory.create(
        disposableOwner,
        map,
        { index: 'a' },
      ).observer;

      expect(proxyRegister.getProxy(nestedMap)).toBeUndefined();
      expect(map.get('b')).toBe(nestedMap);
    });

    describe('Mix non-recursive and recursive observers', () => {
      it('Change event for recursive observer will be emmited when changing root item', async () => {
        const nestedMap = new Map();
        const map = new Map([['a', nestedMap]]);

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          map,
          { index: 'a' },
        ).observer;

        observer2 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          map,
          {
            index: 'a',
            indexWatchRule,
          },
        ).observer;

        const newValue = new Map([['x', 11]]);
        const actual = await new WaitForEvent(observer2, 'changed').wait(() => {
          const mapProxy = proxyRegister.getProxy<Map<string, unknown>>(map);
          mapProxy.set('a', newValue);
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [{ context: map, index: 'a' }],
          target: map,
          index: 'a',
          newValue: newValue,
        };
        expect(actual).toDeepEqualCircular(expected);
      });

      it('Change event for non-recursived observer will be emmited when changing root item', async () => {
        const nestedMap = new Map();
        const map = new Map([['a', nestedMap]]);

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          map,
          { index: 'a' },
        ).observer;

        observer2 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          map,
          {
            index: 'a',
            indexWatchRule,
          },
        ).observer;

        const newValue = new Map([['x', 11]]);
        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          const mapProxy = proxyRegister.getProxy<Map<string, unknown>>(map);
          mapProxy.set('a', newValue);
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [{ context: map, index: 'a' }],
          target: map,
          index: 'a',
          newValue: newValue,
        };
        expect(actual).toDeepEqualCircular(expected);
      });

      it('No change event for non-recursived observer will be emmited when changing nested item', async () => {
        const map = new Map([['a', new Map()]]);

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          map,
          { index: 'a' },
        ).observer;

        observer2 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          map,
          {
            index: 'a',
            indexWatchRule,
          },
        ).observer;

        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          map.get('a')?.set('b', 20);
        });
        expect(actual).toBeNull();
      });

      it('Change event for recursived observer will be emmited when changing nested item', async () => {
        const nestedMap = new Map();
        const map = new Map([['a', nestedMap]]);

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          map,
          { index: 'a' },
        ).observer;

        observer2 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          map,
          {
            index: 'a',
            indexWatchRule,
          },
        ).observer;

        const actual = await new WaitForEvent(observer2, 'changed').wait(() => {
          map.get('a')?.set('b', 20);
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [
            { context: map, index: 'a' },
            { context: nestedMap, index: 'b' },
          ],
          target: nestedMap,
          index: 'b',
          newValue: 20,
        };
        expect(actual).toDeepEqualCircular(expected);
      });
    });

    describe('Change events', () => {
      it('Will emit change when replacing value at a observed key', async () => {
        const map = new Map([
          ['a', 1],
          ['b', 2],
        ]);

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          map,
          { index: 'a' },
        ).observer;

        const mapProxy = proxyRegister.getProxy<Map<string, number>>(map);

        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          mapProxy.set('a', 10);
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [{ context: map, index: 'a' }],
          target: map,
          index: 'a',
          newValue: 10,
        };
        expect(actual).toEqual(expected);
      });

      it('Will not emit a change event when replacing the value at an unobserved key.', async () => {
        const map = new Map([
          ['a', 1],
          ['b', 2],
        ]);

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          map,
          { index: 'a' },
        ).observer;

        const mapProxy = proxyRegister.getProxy<Map<string, number>>(map);

        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          mapProxy.set('b', 20);
        });

        expect(actual).toBeNull();
      });

      it('Will emit a change event when deleting an observed nested item for a recursive observer.', async () => {
        const nestedMap = new Map([
          ['x', 1],
          ['y', 2],
        ]);
        const map = new Map([['a', nestedMap]]);

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          map,
          {
            index: 'a',
            indexWatchRule,
          },
        ).observer;

        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          map.get('a')?.delete('y');
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [
            { context: map, index: 'a' },
            { context: nestedMap, index: 'y' },
          ],
          target: map.get('a'),
          index: 'y',
          newValue: undefined,
        };
        expect(actual).toDeepEqualCircular(expected);
      });

      it('Will emit a change event when replacing an observed nested item for a recursive observer.', async () => {
        const nestedMap = new Map();
        const map = new Map([['a', nestedMap]]);

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          map,
          {
            index: 'a',
            indexWatchRule,
          },
        ).observer;

        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          map?.get('a')?.set('b', 10);
        });

        const expected: IPropertyChange = {
          arguments: [],
          target: nestedMap,
          chain: [
            { context: map, index: 'a' },
            { context: nestedMap, index: 'b' },
          ],
          index: 'b',
          newValue: 10,
        };
        expect(actual).toDeepEqualCircular(expected);
      });

      it('Will emit a change event when changing an observed nested item for a recursive observer.', async () => {
        const nestedMap = new Map([['z', { x: 1 }]]);
        const map = new Map([['a', nestedMap]]);

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          map,
          {
            index: 'a',
            indexWatchRule,
          },
        ).observer;

        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          (Type.toObject(map.get('a')?.get('z')) ?? {}).x = 100;
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [
            { context: map, index: 'a' },
            { context: nestedMap, index: 'z' },
            { context: nestedMap.get('z'), index: 'x' },
          ],
          target: nestedMap.get('z'),
          index: 'x',
          newValue: 100,
        };
        expect(actual).toDeepEqualCircular(expected);
      });

      it('Will not emit change when replacing value at a observed key with the same value.', async () => {
        const map = new Map([['a', 1]]);
        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          map,
          { index: 'a' },
        ).observer;
        const mapProxy = proxyRegister.getProxy<Map<string, number>>(map);

        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          mapProxy.set('a', 1);
        });

        expect(actual).toBeNull();
      });
    });
  });

  describe('Set', () => {
    it('Will observe the item at the given key for a recursive observer.', async () => {
      const nestedSet = new Set();
      const set = new Set([nestedSet]);

      observer1 = collectionItemObserverProxyPairFactory.create(
        disposableOwner,
        set,
        {
          index: nestedSet,
          indexWatchRule,
        },
      ).observer;

      expect(Array.from(set)[0]).toBe(proxyRegister.getProxy(nestedSet));
    });

    it('A non-recursive observer will not observe the item at the given key.', async () => {
      const nestedSet = new Set();
      const set = new Set([new Set(), nestedSet]);

      observer1 = collectionItemObserverProxyPairFactory.create(
        disposableOwner,
        set,
        { index: nestedSet },
      ).observer;

      expect(proxyRegister.getProxy(nestedSet)).toBeUndefined();
      expect(Array.from(set)[1]).toBe(nestedSet);
    });

    describe('Mix non-recursive and recursive observers', () => {
      it('Change event for recursive observer will be emmited when changing root item', async () => {
        const nestedSet = new Set();
        const set = new Set([nestedSet]);

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          set,
          { index: nestedSet },
        ).observer;

        observer2 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          set,
          {
            index: nestedSet,
            indexWatchRule,
          },
        ).observer;

        const actual = await new WaitForEvent(observer2, 'changed').wait(() => {
          const setProxy = proxyRegister.getProxy<Set<Set<unknown>>>(set);
          setProxy.delete(nestedSet);
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [{ context: set, index: nestedSet }],
          target: set,
          index: nestedSet,
          newValue: undefined,
        };
        expect(actual).toDeepEqualCircular(expected);
      });

      it('Change event for non-recursived observer will be emmited when changing root item', async () => {
        const nestedSet = new Set();
        const set = new Set([new Set(), nestedSet]);

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          set,
          { index: nestedSet },
        ).observer;

        observer2 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          set,
          {
            index: nestedSet,
            indexWatchRule,
          },
        ).observer;

        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          const setProxy = proxyRegister.getProxy<Set<Set<unknown>>>(set);
          setProxy.delete(nestedSet);
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [{ context: set, index: nestedSet }],
          target: set,
          index: nestedSet,
          newValue: undefined,
        };
        expect(actual).toDeepEqualCircular(expected);
      });

      it('No change event for non-recursived observer will be emmited when changing nested item', async () => {
        const nestedSet = new Set();
        const set = new Set([new Set(), nestedSet]);

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          set,
          { index: nestedSet },
        ).observer;

        observer2 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          set,
          {
            index: nestedSet,
            indexWatchRule,
          },
        ).observer;

        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          Array.from(set)[1].add(10);
        });
        expect(actual).toBeNull();
      });

      it('Change event for recursived observer will be emmited when changing nested item', async () => {
        const nestedSet = new Set();
        const set = new Set([new Set(), nestedSet]);

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          set,
          { index: nestedSet },
        ).observer;

        observer2 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          set,
          {
            index: nestedSet,
            indexWatchRule,
          },
        ).observer;

        const actual = await new WaitForEvent(observer2, 'changed').wait(() => {
          Array.from(set)[1].add(10);
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [
            { context: set, index: nestedSet },
            { context: nestedSet, index: 10 },
          ],
          target: nestedSet,
          index: 10,
          newValue: 10,
        };
        expect(actual).toDeepEqualCircular(expected);
      });
    });

    describe('Change events', () => {
      it('Will emit change when replacing value at a observed key', async () => {
        const set = new Set([1, 2]);

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          set,
          { index: 1 },
        ).observer;

        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          const setProxy = proxyRegister.getProxy<Set<number>>(set);
          setProxy.delete(1);
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [{ context: set, index: 1 }],
          target: set,
          index: 1,
          newValue: undefined,
        };
        expect(actual).toEqual(expected);
      });

      it('Will not emit a change event when replacing the value at an unobserved key.', async () => {
        const set = new Set([1, 2]);

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          set,
          { index: 1 },
        ).observer;

        const mapProxy = proxyRegister.getProxy<Set<number>>(set);

        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          mapProxy.delete(2);
        });

        expect(actual).toBeNull();
      });

      it('Will emit a change event when deleting an observed nested item for a recursive observer.', async () => {
        const nestedSet = new Set([100]);
        const set = new Set([new Set(), nestedSet]);

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          set,
          {
            index: nestedSet,
            indexWatchRule,
          },
        ).observer;

        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          Array.from(set)[1].delete(100);
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [
            { context: set, index: nestedSet },
            { context: nestedSet, index: 100 },
          ],
          target: nestedSet,
          index: 100,
          newValue: undefined,
        };
        expect(actual).toDeepEqualCircular(expected);
      });

      it('Will emit a change event when changing an observed nested item for a recursive observer.', async () => {
        const nestedObject = { x: 1 };
        const nestedSet = new Set([nestedObject]);
        const set = new Set([nestedSet]);

        observer1 = collectionItemObserverProxyPairFactory.create(
          disposableOwner,
          set,
          {
            index: nestedSet,
            indexWatchRule,
          },
        ).observer;

        const actual = await new WaitForEvent(observer1, 'changed').wait(() => {
          nestedObject.x = 100;
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [
            { context: set, index: nestedSet },
            { context: nestedSet, index: nestedObject },
            { context: nestedObject, index: 'x' },
          ],
          target: nestedObject,
          index: 'x',
          newValue: 100,
        };
        expect(actual).toDeepEqualCircular(expected);
      });
    });
  });
});
