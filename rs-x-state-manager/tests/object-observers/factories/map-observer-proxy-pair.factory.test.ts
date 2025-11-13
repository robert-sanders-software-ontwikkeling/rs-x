import {
   ErrorLog,
   InjectionContainer,
   IPropertyChange,
   truePredicate,
   WaitForEvent,
} from '@rs-x/core';
import { IMapObserverProxyPairFactory } from '../../../lib/object-observer/factories/map-observer-proxy-pair.factory.type';
import { IObjectPropertyObserverProxyPairManager } from '../../../lib/object-property-observer-proxy-pair-manager.type';
import { ObserverGroup } from '../../../lib/observer-group';
import { IObserver } from '../../../lib/observer.interface';
import { IMustProxifyItemHandlerFactory } from '../../../lib/property-observer/must-proxify-item-handler.factory.type';
import { IMapProxyFactory } from '../../../lib/proxies/map-proxy/map-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../../lib/rs-x-state-manager-injection-tokes';
import { RsXStateManagerModule } from '../../../lib/rs-x-state-manager.module';
import { DisposableOwnerMock } from '../../../lib/testing/disposable-owner.mock';

describe('IMapObserverProxyPairFactory tests', () => {
   let mapProxyFactory: IMapProxyFactory;
   let disposableOwner: DisposableOwnerMock;
   let observer: IObserver;
   let mapObserverProxyPairFactory: IMapObserverProxyPairFactory;

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
         observer = null;
      }
   });

   it('applies will return true when passed in value is map', async () => {
      const actual = mapObserverProxyPairFactory.applies(new Map());
      expect(actual).toEqual(true);
   });

   it('applies will return false when passed in value is not map', async () => {
      const actual = mapObserverProxyPairFactory.applies({});
      expect(actual).toEqual(false);
   });

   it('create will create a map proxy', async () => {
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

   it('create will return  Observergroup without item observers for non-recursive observer', async () => {
      const objectMap = new Map([
         ['a', { x: 1 }],
         ['b', { x: 2 }],
      ]);
      observer = mapObserverProxyPairFactory.create(disposableOwner, {
         target: objectMap,
      }).observer;

      const mapProxyId = mapProxyFactory.getId({
         map: objectMap,
      });

      const expected = new ObserverGroup(
         disposableOwner,
         objectMap,
         objectMap,
         truePredicate,
         new ErrorLog(),
         undefined,
         () => mapProxyFactory.getFromId(mapProxyId).observer,
         true
      );
      expect(observer).observerEqualTo(expected);
   });

   it('create will return  an Observergroup with item observers for recursive observer', async () => {
      const mustProxifyHandlerFactory =
         InjectionContainer.get<IMustProxifyItemHandlerFactory>(
            RsXStateManagerInjectionTokens.IMustProxifyItemHandlerFactory
         );
      const objectMap = new Map([
         ['a', { x: 1 }],
         ['b', { x: 2 }],
      ]);

      observer = mapObserverProxyPairFactory.create(disposableOwner, {
         target: objectMap,
         mustProxify: truePredicate,
      }).observer;

      const objectPropertyObserverProxyPairManager =
         InjectionContainer.get<IObjectPropertyObserverProxyPairManager>(
            RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
         );
      const propertyObserverProxyPairManager =
         objectPropertyObserverProxyPairManager.getFromId(objectMap);

      expect(propertyObserverProxyPairManager).toBeDefined();

      const item1Id = propertyObserverProxyPairManager.getId({
         key: 'a',
         mustProxify: mustProxifyHandlerFactory.getFromId('a'),
      });
      const item2Id = propertyObserverProxyPairManager.getId({
         key: 'b',
         mustProxify: mustProxifyHandlerFactory.getFromId('b'),
      });
      const mapProxyId = mapProxyFactory.getId({
         map: objectMap,
         mustProxify: truePredicate,
      });

      const expected = new ObserverGroup(
         disposableOwner,
         objectMap,
         objectMap,
         truePredicate,
         new ErrorLog(),
         undefined,
         () => mapProxyFactory.getFromId(mapProxyId).observer,
         true
      ).addObservers([
         propertyObserverProxyPairManager.getFromId(item1Id).observer,
         propertyObserverProxyPairManager.getFromId(item2Id).observer,
      ]);
      expect(observer).observerEqualTo(expected);
   });

   it('set will emit change event', async () => {
      const objectMap = new Map([
         ['a', { x: 1 }],
         ['b', { x: 2 }],
      ]);
      observer = mapObserverProxyPairFactory.create(disposableOwner, {
         target: objectMap,
      }).observer;
      const mapProxyId = mapProxyFactory.getId({
         map: objectMap,
      });
      const mapProxy = mapProxyFactory.getFromId(mapProxyId).proxy;

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         mapProxy.set('c', { x: 3 });
      });

      const expected: IPropertyChange = {
         arguments: [],
         chain: [{ object: observer.target, id: 'c' }],
         id: 'c',
         newValue: { x: 3 },
         target: observer.target,
         isNew: true,
      };

      expect(actual).toEqual(expected);
   });

   it('items will not be observed when creating not-recursive observer', () => {
      const objectMap = new Map([
         ['a', { x: 1 }],
         ['b', { x: 2 }],
      ]);

      const observerProxyPair = mapObserverProxyPairFactory.create(
         disposableOwner,
         { target: objectMap }
      );
      observer = observerProxyPair.observer;
      disposableOwner.canDispose.mockReturnValue(true);

      const objectPropertyObserverProxyPairManager =
         InjectionContainer.get<IObjectPropertyObserverProxyPairManager>(
            RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
         );
      const propertyObserverProxyPairManager =
         objectPropertyObserverProxyPairManager.getFromId(objectMap);

      expect(mapProxyFactory.getFromId(observerProxyPair.id)).toBeDefined();
      expect(propertyObserverProxyPairManager).toBeUndefined();
   });

   it('dispose will release the map', async () => {
      const objectMap = new Map([
         ['a', { x: 1 }],
         ['b', { x: 2 }],
      ]);
      const observerProxyPair = mapObserverProxyPairFactory.create(
         disposableOwner,
         {
            target: objectMap,
         }
      );
      observer = observerProxyPair.observer;
      disposableOwner.canDispose.mockReturnValue(true);

      expect(mapProxyFactory.getFromId(observerProxyPair.id)).toBeDefined();

      observer.dispose();

      expect(mapProxyFactory.getFromId(observerProxyPair.id)).toBeUndefined();
   });

   it('dispose will release the item for recurive observer', async () => {
      const mustProxifyHandlerFactory =
         InjectionContainer.get<IMustProxifyItemHandlerFactory>(
            RsXStateManagerInjectionTokens.IMustProxifyItemHandlerFactory
         );
      const objectMap = new Map([
         ['a', { x: 1 }],
         ['b', { x: 2 }],
      ]);

      const observerProxyPair = mapObserverProxyPairFactory.create(
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
      const item1Id = propertyObserverProxyPairManager.getId({
         key: 'a',
         mustProxify: mustProxifyHandlerFactory.getFromId('a'),
      });
      const item2Id = propertyObserverProxyPairManager.getId({
         key: 'b',
         mustProxify: mustProxifyHandlerFactory.getFromId('b'),
      });

      expect(mapProxyFactory.getFromId(observerProxyPair.id)).toBeDefined();
      expect(propertyObserverProxyPairManager.getFromId(item1Id)).toBeDefined();
      expect(propertyObserverProxyPairManager.getFromId(item2Id)).toBeDefined();

      observer.dispose();

      expect(mapProxyFactory.getFromId(observerProxyPair.id)).toBeUndefined();
      expect(
         propertyObserverProxyPairManager.getFromId(item1Id)
      ).toBeUndefined();
      expect(
         propertyObserverProxyPairManager.getFromId(item2Id)
      ).toBeUndefined();
   });
});
