import {
   InjectionContainer,
   IPropertyChange,
   truePredicate,
   WaitForEvent,
} from '@rs-x-core';
import { IObserver } from '../../../../lib/observer.interface';
import { IPropertyObserverProxyPairFactory } from '../../../../lib/property-observer/property-observer-proxy-pair.factory.interface';
import { IMapProxyFactory } from '../../../../lib/proxies/map-proxy/map-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../../../lib/rs-x-state-manager-injection-tokes';
import { RsXStateManagerModule } from '../../../../lib/rs-x-state-manager.module';
import { DisposableOwnerMock } from '../../../../lib/testing/disposable-owner.mock';

describe('MapItemObserverProxyPairFactory tests', () => {
   let disposableOwner: DisposableOwnerMock;
   let observer: IObserver;
   let mapProxyFactory: IMapProxyFactory;
   let mapItemObserverFactory: IPropertyObserverProxyPairFactory;

   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);
      mapProxyFactory = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IMapProxyFactory
      );
      mapItemObserverFactory = InjectionContainer.get(
         RsXStateManagerInjectionTokens.MapItemObserverProxyPairFactory
      );
   });

   afterAll(async () => {
      await InjectionContainer.unload(RsXStateManagerModule);
   });

   beforeEach(() => {
      disposableOwner = new DisposableOwnerMock();
   });

   afterEach(() => {
      if (observer) {
         observer.dispose();
         observer = null;
      }
   });

   it('will observer item at given key for recursive observer', async () => {
      const nestedMap = new Map();
      const map = new Map([['a', nestedMap]]);

      const observerProxyPair = mapItemObserverFactory.create(
         disposableOwner,
         map,
         { key: 'a', mustProxify: truePredicate }
      );
      observer = observerProxyPair.observer;

      expect(map.get('a')).toBe(observerProxyPair.proxy);
   });

   it('will not observer item at given key for non-recursive observer', async () => {
      const nestedMap = new Map();
      const map = new Map([
         ['a', new Map()],
         ['b', nestedMap],
      ]);

      const observerProxyPair = mapItemObserverFactory.create(
         disposableOwner,
         map,
         { key: 'b' }
      );
      observer = observerProxyPair.observer;

      expect(map.get('b')).toBe(nestedMap);
   });

   describe('change events', () => {
      it('will emit change when replacing value at a certain key', async () => {
         const map = new Map([
            ['a', 1],
            ['b', 2],
         ]);
         observer = mapItemObserverFactory.create(disposableOwner, map, {
            key: 'a',
         }).observer;

         const mapProxy = mapProxyFactory.getFromData({ map }).proxy as Map<
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
            id: 'a',
            newValue: 10,
            hasRebindNested: false,
         };
         expect(actual).toEqual(expected);
      });
   });

   it('will emit change event change when changing nested item for recursive observer', async () => {
      const nestedMap = new Map([
         ['x', 1],
         ['y', 2],
      ]);
      const map = new Map([['a', nestedMap]]);

      observer = mapItemObserverFactory.create(disposableOwner, map, {
         key: 'a',
         mustProxify: truePredicate,
      }).observer;

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         map.get('a').delete('y');
      });

      const expected: IPropertyChange = {
         arguments: [],
         target: map.get('a'),
         chain: [
            { object: map, id: 'a' },
            { object: nestedMap, id: 'y' },
         ],
         id: 'y',
         isNew: false,
         newValue: undefined,
      };
      expect(actual).toDeepEqualCircular(expected);
   });

   it('will emit change event change for nested map item value  for recursive observer', async () => {
      const nestedMap = new Map();
      const map = new Map([['a', nestedMap]]);

      observer = mapItemObserverFactory.create(disposableOwner, map, {
         key: 'a',
         mustProxify: truePredicate,
      }).observer;

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         map.get('a').set('b', 10);
      });

      const expected: IPropertyChange = {
         arguments: [],
         target: nestedMap,
         chain: [
            { object: map, id: 'a' },
            { object: nestedMap, id: 'b' },
         ],
         id: 'b',
         newValue: 10,
         isNew: true,
      };
      expect(actual).toDeepEqualCircular(expected);
   });

   it('will not emit change when replacing value at a certain key with same value', async () => {
      const map = new Map([['a', 1]]);
      observer = mapItemObserverFactory.create(disposableOwner, map, {
         key: 'a',
      }).observer;

      const mapProxy = mapProxyFactory.getFromData({
         map,
      }).proxy;

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         mapProxy.set('a', 1);
      });

      expect(actual).toBeNull();
   });
});
