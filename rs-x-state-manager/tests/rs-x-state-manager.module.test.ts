import { InjectionContainer } from '@rs-x/core';

import { ArrayObserverProxyPairFactory } from '../lib/object-observer/factories/array-observer-proxy-pair.factory';
import { DateObserverProxyPairFactory } from '../lib/object-observer/factories/date-observer-proxy-pair.factory';
import { MapObserverProxyPairFactory } from '../lib/object-observer/factories/map-observer-proxy-pair.factory';
import { ObservableObserverProxyPairFactory } from '../lib/object-observer/factories/observable-observer-proxy-pair.factory';
import { PlainObjectObserverProxyPairFactory } from '../lib/object-observer/factories/plain-object-observer-proxy-pair.factory';
import { PromiseObserverProxyPairFactory } from '../lib/object-observer/factories/promise-observer-proxy-pair.factory';
import { SetObserverProxyPairFactory } from '../lib/object-observer/factories/set-observer-proxy-pair.factory';
import { ObjectObserverProxyPairFactoryProvider } from '../lib/object-observer/object-observer-proxy-pair-factory.provider';
import { ObjectObserverProxyPairManager } from '../lib/object-observer/object-observer-proxy-pair-manager';
import { ObjectPropertyObserverProxyPairManager } from '../lib/object-property-observer-proxy-pair-manager';
import { CollectionItemObserverManager } from '../lib/property-observer/factories/collection-item/collection-item-observer-manager';
import { CollectionItemObserverProxyPairFactory } from '../lib/property-observer/factories/collection-item/collection-item-observer-proxy-pair.factory';
import { DatePropertyObserverManager } from '../lib/property-observer/factories/date-property/data-property-observer-manager';
import { DatePropertyObserverProxyPairFactory } from '../lib/property-observer/factories/date-property/date-property-observer-proxy-pair.factory';
import { NonIterableObjectPropertyObserverProxyPairFactory } from '../lib/property-observer/factories/non-iterable-object-property';
import { ObjectPropertyObserverManager } from '../lib/property-observer/factories/non-iterable-object-property/object-property-observer-manager';
import { MustProxifyItemHandlerFactory } from '../lib/property-observer/must-proxify-item-handler.factory';
import { ArrayProxyFactory } from '../lib/proxies/array-proxy/array-proxy.factory';
import { DateProxyFactory } from '../lib/proxies/date-proxy/date-proxy.factory';
import { MapProxyFactory } from '../lib/proxies/map-proxy/map-proxy.factory';
import { ObservableProxyFactory } from '../lib/proxies/observable-proxy/observable-proxy.factory';
import { PromiseProxyFactory } from '../lib/proxies/promise-proxy/promise-proxy.factory';
import { ProxyRegistry } from '../lib/proxies/proxy-registry/proxy-registry';
import { SetProxyFactory } from '../lib/proxies/set-proxy/set-proxy.factory';
import {
   RsXStateManagerModule,
   unloadRsXStateManagerModule,
} from '../lib/rs-x-state-manager.module';
import { RsXStateManagerInjectionTokens } from '../lib/rs-x-state-manager-injection-tokes';
import { ObjectStateManager } from '../lib/state-manager/object-state-manager';
import { StateManager } from '../lib/state-manager/state-manager';

describe('RsXStateManagerModule', () => {
   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);
   });

   afterAll(async () => {
      await unloadRsXStateManagerModule();
   });

   it('can get instance of IArrayProxyFactory', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IArrayProxyFactory
      );
      expect(actual).toBeInstanceOf(ArrayProxyFactory);
   });

   it('IArrayProxyFactory instance is a singleton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IArrayProxyFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IArrayProxyFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get IMapProxyFactory instance', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IMapProxyFactory
      );
      expect(actual).toBeInstanceOf(MapProxyFactory);
   });

   it('instance of IMapProxyFactory is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IMapProxyFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IMapProxyFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get a instance of ISetProxyFactory', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ISetProxyFactory
      );
      expect(actual).toBeInstanceOf(SetProxyFactory);
   });

   it('instance of ISetProxyFactory is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ISetProxyFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ISetProxyFactory
      );
      expect(a1).toBe(a2);
   });


   it('can get a instance of IDateProxyFactory', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IDateProxyFactory
      );
      expect(actual).toBeInstanceOf(DateProxyFactory);
   });

   it('instance of IDateProxyFactory is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IDateProxyFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IDateProxyFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get a instance of IPromiseProxyFactory', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IPromiseProxyFactory
      );
      expect(actual).toBeInstanceOf(PromiseProxyFactory);
   });

   it('instance of IPromiseProxyFactory is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IPromiseProxyFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IPromiseProxyFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get a instance of IObservableProxyFactory', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObservableProxyFactory
      );
      expect(actual).toBeInstanceOf(ObservableProxyFactory);
   });

   it('instance of IObservableProxyFactory is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObservableProxyFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObservableProxyFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get a instance of IProxyRegistry', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IProxyRegistry
      );
      expect(actual).toBeInstanceOf(ProxyRegistry);
   });

   it('instance of IProxyRegistry is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IProxyRegistry
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IProxyRegistry
      );
      expect(a1).toBe(a2);
   });

   it('can get instance of IObjectPropertyObserverProxyPairManager', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
      );
      expect(actual).toBeInstanceOf(ObjectPropertyObserverProxyPairManager);
   });

   it('instance of IObjectPropertyObserverProxyPairManager is a singleton ', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
      );
      expect(a1).toBe(a2);
   });

   it('can get instance of IArrayObserverProxyPairFactory', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IArrayObserverProxyPairFactory
      );
      expect(actual).toBeInstanceOf(ArrayObserverProxyPairFactory);
   });

   it('IArrayObserverProxyPairFactory instance is a singleton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IArrayObserverProxyPairFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IArrayObserverProxyPairFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get a instance of PromiseObserverProxyPairFactory ', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.PromiseObserverProxyPairFactory
      );
      expect(actual).toBeInstanceOf(PromiseObserverProxyPairFactory);
   });

   it('PromiseObserverProxyPairFactory instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.PromiseObserverProxyPairFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.PromiseObserverProxyPairFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of ObservableObserverProxyPairFactory', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ObservableObserverProxyPairFactory
      );
      expect(actual).toBeInstanceOf(ObservableObserverProxyPairFactory);
   });

   it('ObservableObserverProxyPairFactory instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ObservableObserverProxyPairFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ObservableObserverProxyPairFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of IMapObserverProxyPairFactory', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IMapObserverProxyPairFactory
      );
      expect(actual).toBeInstanceOf(MapObserverProxyPairFactory);
   });

   it('IMapObserverProxyPairFactory instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IMapObserverProxyPairFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IMapObserverProxyPairFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of ISetObserverProxyPairFactory', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ISetObserverProxyPairFactory
      );
      expect(actual).toBeInstanceOf(SetObserverProxyPairFactory);
   });

   it('ISetObserverProxyPairFactory instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ISetObserverProxyPairFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ISetObserverProxyPairFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of IObjectObserverProxyPairFactoryList', () => {
      const actual = InjectionContainer.getAll(
         RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList
      );

      expect(actual.length).toEqual(7);
      expect(actual[0]).toBeInstanceOf(PlainObjectObserverProxyPairFactory);
      expect(actual[1]).toBeInstanceOf(DateObserverProxyPairFactory);
      expect(actual[2]).toBeInstanceOf(ArrayObserverProxyPairFactory);
      expect(actual[3]).toBeInstanceOf(PromiseObserverProxyPairFactory);
      expect(actual[4]).toBeInstanceOf(ObservableObserverProxyPairFactory);
      expect(actual[5]).toBeInstanceOf(MapObserverProxyPairFactory);
      expect(actual[6]).toBeInstanceOf(SetObserverProxyPairFactory);


   });

   it('IObjectObserverProxyPairFactoryList instance is a singelton', () => {
      const a1 = InjectionContainer.getAll(
         RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList
      );
      const a2 = InjectionContainer.getAll(
         RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList
      );
      expect(a1[0]).toBe(a2[0]);
      expect(a1[1]).toBe(a2[1]);
      expect(a1[2]).toBe(a2[2]);
      expect(a1[3]).toBe(a2[3]);
      expect(a1[4]).toBe(a2[4]);
      expect(a1[5]).toBe(a2[5]);
      expect(a1[6]).toBe(a2[6]);
   });

   it('can get an instance of IPropertyObserverProxyPairFactoryList', () => {
      const actual = InjectionContainer.getAll(
         RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryList
      );

      expect(actual.length).toEqual(3);
      expect(actual[0]).toBeInstanceOf(NonIterableObjectPropertyObserverProxyPairFactory);
      expect(actual[1]).toBeInstanceOf(CollectionItemObserverProxyPairFactory);
      expect(actual[2]).toBeInstanceOf(DatePropertyObserverProxyPairFactory);
   });

   it('IPropertyObserverProxyPairFactoryList instance is a singelton', () => {
      const a1 = InjectionContainer.getAll(
         RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryList
      );
      const a2 = InjectionContainer.getAll(
         RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryList
      );
      expect(a1[0]).toBe(a2[0]);
      expect(a1[1]).toBe(a2[1]);
      expect(a1[2]).toBe(a2[2]);
   });


   it('can get an instance of IObjectObserverProxyPairFactoryProvider', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryProvider
      );
      expect(actual).toBeInstanceOf(ObjectObserverProxyPairFactoryProvider);
   });

   it('IObjectObserverProxyPairFactoryProvider instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryProvider
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryProvider
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of IObjectObserverProxyPairManager', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectObserverProxyPairManager
      );
      expect(actual).toBeInstanceOf(ObjectObserverProxyPairManager);
   });

   it('IObjectObserverProxyPairManager instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectObserverProxyPairManager
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectObserverProxyPairManager
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of IObjectPropertyObserverManager', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectPropertyObserverManager
      );
      expect(actual).toBeInstanceOf(ObjectPropertyObserverManager);
   });

   it('IObjectPropertyObserverManager instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectPropertyObserverManager
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectPropertyObserverManager
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of ICollectionItemObserverManager', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ICollectionItemObserverManager
      );
      expect(actual).toBeInstanceOf(CollectionItemObserverManager);
   });

   it('ICollectionItemObserverManager instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ICollectionItemObserverManager
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ICollectionItemObserverManager
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of IMapItemObserverManager', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ICollectionItemObserverManager
      );
      expect(actual).toBeInstanceOf(CollectionItemObserverManager);
   });

   it('IMapItemObserverManager instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ICollectionItemObserverManager
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ICollectionItemObserverManager
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of IDatePropertyObserverManager', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IDatePropertyObserverManager
      );
      expect(actual).toBeInstanceOf(DatePropertyObserverManager);
   });

   it('IDatePropertyObserverManager instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IDatePropertyObserverManager
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IDatePropertyObserverManager
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of NonIterableObjectPropertyObserverProxyPairFactory', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.NonIterableObjectPropertyObserverProxyPairFactory
      );
      expect(actual).toBeInstanceOf(
         NonIterableObjectPropertyObserverProxyPairFactory
      );
   });

   it('NonIterableObjectPropertyObserverProxyPairFactory instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.NonIterableObjectPropertyObserverProxyPairFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.NonIterableObjectPropertyObserverProxyPairFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of PlainObjectObserverProxyPairFactory', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IPlainObjectObserverProxyPairFactory
      );
      expect(actual).toBeInstanceOf(PlainObjectObserverProxyPairFactory);
   });

   it('PlainObjectObserverProxyPairFactory instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IPlainObjectObserverProxyPairFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IPlainObjectObserverProxyPairFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of ICollectionItemObserverProxyPairFactory', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ICollectionItemObserverProxyPairFactory
      );
      expect(actual).toBeInstanceOf(CollectionItemObserverProxyPairFactory);
   });

   it('ICollectionItemObserverProxyPairFactory instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ICollectionItemObserverProxyPairFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ICollectionItemObserverProxyPairFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of IDatePropertyObserverProxyPairFactory', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IDatePropertyObserverProxyPairFactory
      );
      expect(actual).toBeInstanceOf(DatePropertyObserverProxyPairFactory);
   });

   it('IDatePropertyObserverProxyPairFactory instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IDatePropertyObserverProxyPairFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IDatePropertyObserverProxyPairFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of IObjectStateManager', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectStateManager
      );
      expect(actual).toBeInstanceOf(ObjectStateManager);
   });

   it('IObjectStateManager instance is a transient', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectStateManager
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectStateManager
      );
      expect(a1).not.toBe(a2);
   });


   it('can get an instance of IMustProxifyItemHandlerFactory', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IMustProxifyItemHandlerFactory
      );
      expect(actual).toBeInstanceOf(MustProxifyItemHandlerFactory);
   });

   it('IMustProxifyItemHandlerFactory instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IMustProxifyItemHandlerFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IMustProxifyItemHandlerFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of IObjectObserverProxyPairFactoryProviderFactory', () => {
      let factory: () => void = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryProviderFactory
      );
      expect(factory).toBeInstanceOf(Function);

      const actual = factory();
      expect(actual).toBeInstanceOf(ObjectObserverProxyPairFactoryProvider);
   });

   it('IObjectObserverProxyPairFactoryProviderFactory instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryProviderFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryProviderFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of IStateManager', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IStateManager
      );
      expect(actual).toBeInstanceOf(StateManager);
   });

   it('IStateManager instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IStateManager
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IStateManager
      );
      expect(a1).toBe(a2);
   });
});
