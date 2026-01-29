import { ErrorLog, InjectionContainer, type IPropertyChange, truePredicate, Type, WaitForEvent } from '@rs-x/core';
import { DisposableOwnerMock } from '@rs-x/core/testing';

import { type IMapObserverProxyPairFactory } from '../../../lib/object-observer/factories/map-observer-proxy-pair.factory.type';
import { type IObjectPropertyObserverProxyPairManager } from '../../../lib/object-property-observer-proxy-pair-manager.type';
import { type IObserver } from '../../../lib/observer.interface';
import { ObserverGroup } from '../../../lib/observer-group';
import { type IMapObserverProxyPair, type IMapProxyFactory } from '../../../lib/proxies/map-proxy/map-proxy.factory.type';
import { type IProxyRegistry } from '../../../lib/proxies/proxy-registry/proxy-registry.interface';
import { RsXStateManagerModule } from '../../../lib/rs-x-state-manager.module';
import { RsXStateManagerInjectionTokens } from '../../../lib/rs-x-state-manager-injection-tokes';

describe('MapObserverProxyPairFactory tests', () => {
   let mapObserverProxyPairFactory: IMapObserverProxyPairFactory;
   let mapProxyFactory: IMapProxyFactory;
   let disposableOwner: DisposableOwnerMock;
   let observer: IObserver;

   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);
      mapProxyFactory = InjectionContainer.get<IMapProxyFactory>(
         RsXStateManagerInjectionTokens.IMapProxyFactory
      );
      mapObserverProxyPairFactory =
         InjectionContainer.get<IMapObserverProxyPairFactory>(
            RsXStateManagerInjectionTokens.IMapObserverProxyPairFactory
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
         observer = Type.cast(undefined);
      }
   });

   it('applies will return true when passed in value is Map', async () => {
      const actual = mapObserverProxyPairFactory.applies(new Map());
      expect(actual).toEqual(true);
   });

   it('applies will return false when passed in value is not Map', async () => {
      const actual = mapObserverProxyPairFactory.applies({});
      expect(actual).toEqual(false);
   });

   it('create will create a Map proxy', async () => {
      const map = new Map();
      const observerProxyPair = mapObserverProxyPairFactory.create(
         disposableOwner,
         {
            target: map,
         }
      );

      const expected = mapProxyFactory.getFromData({ map })?.proxy;
      observer = observerProxyPair.observer;
      expect(expected).toBeDefined();
      expect(observerProxyPair.proxy).toBe(expected);
   });

   it('create will return Observergroup', async () => {
      const objectMap = new Map([
         ['a', { x: 1 }],
         ['b', { x: 2 }],
      ]);
      observer = mapObserverProxyPairFactory.create(disposableOwner, {
         target: objectMap,
      }).observer;

      const mapProxyId = mapProxyFactory.getId({
         map: objectMap,
      }) as Map<unknown, unknown>;

      const expected = new ObserverGroup(
         disposableOwner,
         objectMap,
         objectMap,
         truePredicate,
         new ErrorLog(),
         undefined,
         () => mapProxyFactory.getFromId(mapProxyId)?.observer,
         true
      );

      expect(observer).observerEqualTo(expected);
   });

   it('create will return  an Observergroup with item observers when setting mustProxify', async () => {
      const objectMap = new Map([
         ['a', { x: 1 }],
         ['b', { x: 2 }],
      ]);
      observer = mapObserverProxyPairFactory.create(disposableOwner, {
         target: objectMap,
         mustProxify: truePredicate
      }).observer;

      const objectPropertyObserverProxyPairManager =
         InjectionContainer.get<IObjectPropertyObserverProxyPairManager>(
            RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
         );
      const propertyObserverProxyPairManager =
         objectPropertyObserverProxyPairManager.getFromId(objectMap);

      expect(propertyObserverProxyPairManager).toBeDefined();

      const item1Id = propertyObserverProxyPairManager?.getId({
         key: 'a',
         mustProxify: truePredicate,
      });
      const item2Id = propertyObserverProxyPairManager?.getId({
         key: 'b',
         mustProxify: truePredicate,
      });
      const mapProxyId = mapProxyFactory.getId({
         map: objectMap,
      }) as Map<unknown, unknown> 

      const expected = new ObserverGroup(
         disposableOwner,
         objectMap,
         objectMap,
         truePredicate,
         new ErrorLog(),
         undefined,
         () => mapProxyFactory.getFromId(mapProxyId)?.observer,
         true
      ).addObservers([
         propertyObserverProxyPairManager?.getFromId(item1Id)?.observer as IObserver,
         propertyObserverProxyPairManager?.getFromId(item2Id)?.observer as IObserver,
      ]);
      expect(observer).observerEqualTo(expected);
   });

   it('dispose will release the Map proxy', async () => {
      const objectMap = new Map([
         ['a', { x: 1 }],
         ['b', { x: 2 }],
      ]);

      observer = mapObserverProxyPairFactory.create(
         disposableOwner,
         { target: objectMap }
      ).observer;

      disposableOwner.canDispose.mockReturnValue(true);

      expect(mapProxyFactory.getFromId(objectMap)).toBeDefined();

      observer.dispose();

      expect(mapProxyFactory.getFromId(objectMap)).toBeUndefined();
   });

   it('dispose will release the items for recursive observer', async () => {
      const objectMap = new Map([
         ['a', { x: 1 }],
         ['b', { x: 2 }],
      ]);
      const observerProxyPair: IMapObserverProxyPair = mapObserverProxyPairFactory.create(
         disposableOwner,
         { target: objectMap, mustProxify: truePredicate }
      );
      observer = observerProxyPair.observer;
      disposableOwner.canDispose.mockReturnValue(true);

      const objectPropertyObserverProxyPairManager =
         InjectionContainer.get<IObjectPropertyObserverProxyPairManager>(
            RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
         );
      const propertyObserverProxyPairManager =
         objectPropertyObserverProxyPairManager.getFromId(objectMap);
      const item1Id = propertyObserverProxyPairManager?.getId({
         key: 'a',
         mustProxify: truePredicate
      });
      const item2Id = propertyObserverProxyPairManager?.getId({
         key: 'b',
         mustProxify: truePredicate
      });

      expect(mapProxyFactory.getFromId(objectMap)).toBeDefined();
      expect(propertyObserverProxyPairManager?.getFromId(item1Id)).toBeDefined();
      expect(propertyObserverProxyPairManager?.getFromId(item2Id)).toBeDefined();
      expect(objectMap.get('a')).isWritableProperty('x');
      expect(objectMap.get('b')).isWritableProperty('x')

      observer.dispose();

      expect(mapProxyFactory.getFromId(objectMap)).toBeUndefined();
      expect(
         propertyObserverProxyPairManager?.getFromId(item1Id)
      ).toBeUndefined();
      expect(
         propertyObserverProxyPairManager?.getFromId(item2Id)
      ).toBeUndefined();
      expect(objectMap.get('a')).not.isWritableProperty('x');
      expect(objectMap.get('b')).not.isWritableProperty('x')
   });

   it('will only proxify items for which mustProxify returns true', () => {
      const objectMap = new Map([
         ['a', { x: 1 }],
         ['b', { x: 2 }],
         ['c', { x: 3 }],
      ]);

      const mustProxify = jest.fn();
      mustProxify.mockImplementation((index: string) => index === 'a' || index === 'c' || index === 'x');

      const observerProxyPair: IMapObserverProxyPair = mapObserverProxyPairFactory.create(
         disposableOwner,
         { target: objectMap, mustProxify }
      );
      observer = observerProxyPair.observer;

      expect(mustProxify).toHaveBeenCalledTimes(5);
      expect(mustProxify).toHaveBeenNthCalledWith(1, 'a', objectMap);
      expect(mustProxify).toHaveBeenNthCalledWith(2, 'x', objectMap.get('a'));
      expect(mustProxify).toHaveBeenNthCalledWith(3, 'b', objectMap);
      expect(mustProxify).toHaveBeenNthCalledWith(4, 'c', objectMap);
      expect(mustProxify).toHaveBeenNthCalledWith(5, 'x', objectMap.get('c'));
      expect(objectMap.get('a')).isWritableProperty('x');
      expect(objectMap.get('b')).not.isWritableProperty('x');
      expect(objectMap.get('c')).isWritableProperty('x');
   });

   describe(`change event for recursive observer for  '[{ x: 1 }, { x: 2 }]'`, () => {
      let proxyRegister: IProxyRegistry;

      beforeEach(() => {
         proxyRegister = InjectionContainer.get(RsXStateManagerInjectionTokens.IProxyRegistry);
      })

      it('change event is emitted when adding Map item', async () => {
         const objectMap = new Map([
            ['a', { x: 1 }],
            ['b', { x: 2 }],
         ]);
         observer = mapObserverProxyPairFactory.create(disposableOwner, {
            target: objectMap,
            mustProxify: truePredicate
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            const mapProxy = proxyRegister.getProxy<Map<string, { x: number }>>(objectMap)
            mapProxy.set('c', { x: 3 });
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: objectMap, id: 'c' }],
            id: 'c',
            newValue: { x: 3 },
            target: objectMap
         };

         expect(actual).toEqual(expected);
      });

      it('change event is emitted when deleting Map item', async () => {
         const objectMap = new Map([
            ['a', { x: 1 }],
            ['b', { x: 2 }],
         ]);
         observer = mapObserverProxyPairFactory.create(disposableOwner, {
            target: objectMap,
            mustProxify: truePredicate
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            const mapProxy = proxyRegister.getProxy<Map<string, { x: number }>>(objectMap)
            mapProxy.delete('b');
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: objectMap, id: 'b' }],
            id: 'b',
            newValue: undefined,
            target: objectMap
         };

         expect(actual).toEqual(expected);
      });

      it('change event is emitted when changing Map item', async () => {
         const objectMap = new Map([
            ['a', { x: 1 }],
            ['b', { x: 2 }],
         ]);
         observer = mapObserverProxyPairFactory.create(disposableOwner, {
            target: objectMap,
            mustProxify: truePredicate
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            Type.cast<{x: number}>(objectMap.get('b')).x = 200
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [
               { object: objectMap, id: 'b' },
               { object: objectMap.get('b'), id: 'x' }
            ],
            id: 'x',
            newValue: 200,
            target: objectMap.get('b')
         };

         expect(actual).toEqual(expected);
      });
   });

   describe(`change event for non-recursive observer for  '[{ x: 1 }, { x: 2 }]'`, () => {
      let proxyRegister: IProxyRegistry;

      beforeEach(() => {
         proxyRegister = InjectionContainer.get(RsXStateManagerInjectionTokens.IProxyRegistry);
      })

      it('change event is emitted when adding Map item', async () => {
         const objectMap = new Map([
            ['a', { x: 1 }],
            ['b', { x: 2 }],
         ]);
         observer = mapObserverProxyPairFactory.create(disposableOwner, {
            target: objectMap,
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            const mapProxy = proxyRegister.getProxy<Map<string, { x: number }>>(objectMap)
            mapProxy.set('c', { x: 3 });
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: objectMap, id: 'c' }],
            id: 'c',
            newValue: { x: 3 },
            target: objectMap
         };

         expect(actual).toEqual(expected);
      });

      it('change event is emitted when deleting Map item', async () => {
         const objectMap = new Map([
            ['a', { x: 1 }],
            ['b', { x: 2 }],
         ]);
         observer = mapObserverProxyPairFactory.create(disposableOwner, {
            target: objectMap,
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            const mapProxy = proxyRegister.getProxy<Map<string, { x: number }>>(objectMap)
            mapProxy.delete('b');
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: objectMap, id: 'b' }],
            id: 'b',
            newValue: undefined,
            target: objectMap
         };

         expect(actual).toEqual(expected);
      });
      it('change event is not emitted when changing map item', async () => {
         const objectMap = new Map([
            ['a', { x: 1 }],
            ['b', { x: 2 }],
         ]);
         observer = mapObserverProxyPairFactory.create(disposableOwner, {
            target: objectMap,
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            Type.cast<{x: number}>(objectMap.get('b')).x = 200
         });

         expect(actual).toBeNull();
      });
   });
});



