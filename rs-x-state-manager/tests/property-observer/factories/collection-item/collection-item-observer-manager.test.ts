import {
  InjectionContainer,
  type IPropertyChange,
  WaitForEvent,
} from '@rs-x/core';

import { type ICollectionItemObserverManager } from '../../../../lib/property-observer/factories/collection-item/collection-item-observer-manager.type';
import { type IArrayProxyFactory } from '../../../../lib/proxies/array-proxy/array-proxy.factory.type';
import { type IMapProxyFactory } from '../../../../lib/proxies/map-proxy/map-proxy.factory.type';
import { type ISetProxyFactory } from '../../../../lib/proxies/set-proxy/set-proxy.factory.type';
import { RsXStateManagerModule } from '../../../../lib/rs-x-state-manager.module';
import { RsXStateManagerInjectionTokens } from '../../../../lib/rs-x-state-manager-injection-tokens';

describe('ICollectionItemObserverManager tests', () => {
  let collectionItemObserverManager: ICollectionItemObserverManager;

  beforeAll(async () => {
    await InjectionContainer.load(RsXStateManagerModule);

    collectionItemObserverManager = InjectionContainer.get(
      RsXStateManagerInjectionTokens.ICollectionItemObserverManager,
    );
  });

  afterAll(async () => {
    await InjectionContainer.unload(RsXStateManagerModule);
  });

  afterEach(() => {
    collectionItemObserverManager.dispose();
  });

  describe('Array', () => {
    let arrayProxyFactory: IArrayProxyFactory;

    beforeAll(async () => {
      arrayProxyFactory = InjectionContainer.get(
        RsXStateManagerInjectionTokens.IArrayProxyFactory,
      );
    });

    it('will not release the array proxy when releasing a array item but there are still other items registered', async () => {
      const array = [1, 2];
      const observer = collectionItemObserverManager
        .create(array)
        .instance.create({ index: 0 }).instance;
      collectionItemObserverManager.create(array).instance.create({ index: 1 });

      observer.dispose();

      const actual = arrayProxyFactory.getId({
        array: array,
      });
      expect(actual).toBeDefined();
    });

    it('will release the array proxy when releasing a array item and their are no other items registered', async () => {
      const array = [1];
      const observer = collectionItemObserverManager
        .create(array)
        .instance.create({ index: 0 }).instance;

      observer.dispose();

      const actual = arrayProxyFactory.getFromId({
        array: array,
      });
      expect(actual).toBeUndefined();
    });

    it('will release observer when disposing observed index', async () => {
      const array = [1, 2];
      const observer = collectionItemObserverManager
        .create(array)
        .instance.create({ index: 0 }).instance;

      const arrayIndexObserverManager =
        collectionItemObserverManager.getFromId(array);

      expect(arrayIndexObserverManager).toBeDefined();
      expect(arrayIndexObserverManager?.getFromId(0)).toBeDefined();

      observer.dispose();

      expect(collectionItemObserverManager.getFromId(array)).toBeUndefined();
      expect(arrayIndexObserverManager?.isEmpty).toEqual(true);
    });

    describe('change event', () => {
      it('will emit  change event when deleting item: index <= array.length', async () => {
        const array = [1, 2];
        const observer = collectionItemObserverManager
          .create(array)
          .instance.create({ index: 1 }).instance;
        const proxy = arrayProxyFactory.getFromData({ array })
          ?.proxy as unknown[];

        const actual = await new WaitForEvent(observer, 'changed').wait(() => {
          proxy.length = 1;
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [{ object: array, id: 1 }],
          target: array,
          id: 1,
          newValue: undefined,
        };
        expect(actual).toEqual(expected);
      });

      it('will emit change event when removing element', async () => {
        const array = [1, 2, 3];
        const observer = collectionItemObserverManager
          .create(array)
          .instance.create({ index: 2 }).instance;
        const proxy = arrayProxyFactory.getFromData({ array })
          ?.proxy as unknown[];

        const actual = await new WaitForEvent(observer, 'changed').wait(() => {
          proxy.pop();
        });

        expect(actual).toEqual({
          arguments: [],
          chain: [{ object: array, id: 2 }],
          target: array,
          id: 2,
          newValue: undefined,
        });
      });

      it('will not emit change if value does not change', async () => {
        const array = [1, 2, 2];
        const observer = collectionItemObserverManager
          .create(array)
          .instance.create({ index: 1 }).instance;
        const proxy = arrayProxyFactory.getFromData({ array })
          ?.proxy as unknown[];

        const actual = await new WaitForEvent(observer, 'changed').wait(() => {
          proxy.shift();
        });

        expect(actual).toBeNull();
      });
    });
  });

  describe('Map', () => {
    let mapProxyFactory: IMapProxyFactory;

    beforeAll(async () => {
      mapProxyFactory = InjectionContainer.get(
        RsXStateManagerInjectionTokens.IMapProxyFactory,
      );
    });

    it('will release the map proxy when releasing a array item and their are no other items registered', async () => {
      const map = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      const observer = collectionItemObserverManager
        .create(map)
        .instance.create({ index: 'a' }).instance;

      expect(mapProxyFactory.getFromData({ map })).toBeDefined();

      observer.dispose();

      expect(mapProxyFactory.getFromData({ map })).toBeUndefined();
    });

    it('will release observers when all references have nee disposed', async () => {
      const map = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      const mapKeyObserverManager = collectionItemObserverManager.create(map);
      const observer1 = mapKeyObserverManager.instance.create({
        index: 'a',
      }).instance;
      const observer2 = mapKeyObserverManager.instance.create({
        index: 'a',
      }).instance;

      observer1.dispose();

      expect(collectionItemObserverManager.getFromId(map)).toBeDefined();
      expect(mapProxyFactory.getFromData({ map })).toBeDefined();
      expect(collectionItemObserverManager.getFromId(map)).toBeDefined();
      expect(mapProxyFactory.getFromData({ map })).toBeDefined();

      observer2.dispose();

      expect(collectionItemObserverManager.getFromId(map)).toBeUndefined();
      expect(mapProxyFactory.getFromData({ map })).toBeUndefined();
    });

    describe('change event', () => {
      it('will not observer slot change for unregistered indexes', async () => {
        const map = new Map([
          ['a', 1],
          ['b', 2],
        ]);
        const observer = collectionItemObserverManager
          .create(map)
          .instance.create({ index: 'b' }).instance;
        const mapProxy = mapProxyFactory.getFromData({ map })?.proxy as Map<
          string,
          number
        >;

        const actual = await new WaitForEvent(observer, 'changed').wait(() => {
          mapProxy.set('a', 10);
        });

        expect(actual).toBeNull();
      });
      it('will emit  change event when deleting item', async () => {
        const map = new Map([
          ['a', 1],
          ['b', 2],
        ]);
        const observer = collectionItemObserverManager
          .create(map)
          .instance.create({ index: 'a' }).instance;
        const mapProxy = mapProxyFactory.getFromData({ map })?.proxy as Map<
          string,
          number
        >;

        const actual = await new WaitForEvent(observer, 'changed').wait(() => {
          mapProxy.delete('a');
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [{ object: map, id: 'a' }],
          target: map,
          newValue: undefined,
          id: 'a',
        };
        expect(actual).toEqual(expected);
      });

      it('will emit change event when replacing element', async () => {
        const map = new Map([
          ['a', 1],
          ['b', 2],
        ]);
        const observer = collectionItemObserverManager
          .create(map)
          .instance.create({ index: 'a' }).instance;
        const mapProxy = mapProxyFactory.getFromData({ map })?.proxy as Map<
          string,
          number
        >;

        const actual = await new WaitForEvent(observer, 'changed').wait(() => {
          mapProxy.set('a', 10);
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [{ object: map, id: 'a' }],
          target: map,
          newValue: 10,
          id: 'a',
        };
        expect(actual).toEqual(expected);
      });

      it('will not emit change if value does not change', async () => {
        const map = new Map([
          ['a', 1],
          ['b', 2],
        ]);
        const observer = collectionItemObserverManager
          .create(map)
          .instance.create({ index: 'a' }).instance;
        const mapProxy = mapProxyFactory.getFromData({ map })?.proxy as Map<
          string,
          number
        >;

        const actual = await new WaitForEvent(observer, 'changed').wait(() => {
          mapProxy.set('a', 1);
        });

        expect(actual).toBeNull();
      });
    });
  });

  describe('Set', () => {
    let setProxyFactory: ISetProxyFactory;

    beforeAll(async () => {
      setProxyFactory = InjectionContainer.get(
        RsXStateManagerInjectionTokens.ISetProxyFactory,
      );
    });

    it('will release the set proxy when releasing a set item and their are no other items registered', async () => {
      const set = new Set([1, 2]);
      const observer = collectionItemObserverManager
        .create(set)
        .instance.create({ index: 1 }).instance;

      expect(setProxyFactory.getFromData({ set })).toBeDefined();

      observer.dispose();

      expect(setProxyFactory.getFromData({ set })).toBeUndefined();
    });

    it('will release observers when all references have nee disposed', async () => {
      const set = new Set([1, 2]);
      const mapKeyObserverManager = collectionItemObserverManager.create(set);
      const observer1 = mapKeyObserverManager.instance.create({
        index: 1,
      }).instance;
      const observer2 = mapKeyObserverManager.instance.create({
        index: 1,
      }).instance;

      observer1.dispose();

      expect(collectionItemObserverManager.getFromId(set)).toBeDefined();
      expect(setProxyFactory.getFromData({ set })).toBeDefined();
      expect(collectionItemObserverManager.getFromId(set)).toBeDefined();
      expect(setProxyFactory.getFromData({ set })).toBeDefined();

      observer2.dispose();

      expect(collectionItemObserverManager.getFromId(set)).toBeUndefined();
      expect(setProxyFactory.getFromData({ set })).toBeUndefined();
    });

    describe('change event', () => {
      it('will not observer slot change for unregistered indexes', async () => {
        const set = new Set([1, 2]);
        const observer = collectionItemObserverManager
          .create(set)
          .instance.create({ index: 1 }).instance;
        const setProxy = setProxyFactory.getFromData({ set })
          ?.proxy as Set<unknown>;

        const actual = await new WaitForEvent(observer, 'changed').wait(() => {
          setProxy.delete(2);
        });

        expect(actual).toBeNull();
      });

      it('will emit change event when deleting observed item', async () => {
        const set = new Set([1, 2]);
        const observer = collectionItemObserverManager
          .create(set)
          .instance.create({ index: 1 }).instance;
        const setProxy = setProxyFactory.getFromData({ set })
          ?.proxy as Set<unknown>;

        const actual = await new WaitForEvent(observer, 'changed').wait(() => {
          setProxy.delete(1);
        });

        const expected: IPropertyChange = {
          arguments: [],
          chain: [{ object: set, id: 1 }],
          target: set,
          newValue: undefined,
          id: 1,
        };
        expect(actual).toEqual(expected);
      });
    });
  });
});
