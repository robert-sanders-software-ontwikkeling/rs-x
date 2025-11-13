import { InjectionContainer } from '@rs-x/core';
import { ArrayObserverProxyPairFactory } from '../lib/object-observer/factories/array-observer-proxy-pair.factory';
import { MapObserverProxyPairFactory } from '../lib/object-observer/factories/map-observer-proxy-pair.factory';
import { ObservableObserverProxyPairFactory } from '../lib/object-observer/factories/observable-observer-proxy-pair.factory';
import { PlainObjectObserverProxyPairFactory } from '../lib/object-observer/factories/plain-object-observer-proxy-pair.factory';
import { PromiseObserverProxyPairFactory } from '../lib/object-observer/factories/promise-observer-proxy-pair.factory';
import { SetObserverProxyPairFactory } from '../lib/object-observer/factories/set-observer-proxy-pair.factory';
import { ObjectObserverProxyPairFactoryProvider } from '../lib/object-observer/object-observer-proxy-pair-factory.provider';
import { ObjectObserverProxyPairManager } from '../lib/object-observer/object-observer-proxy-pair-manager';
import { ObjectPropertyObserverProxyPairManager } from '../lib/object-property-observer-proxy-pair-manager';
import { ArrayItemObserverProxyPairFactory } from '../lib/property-observer/factories/array-item/array-item-observe-proxy-pair.factory';
import { ArrayItemObserverManager } from '../lib/property-observer/factories/array-item/array-item-observer-manager';
import { MapItemObserverManager } from '../lib/property-observer/factories/map-item/map-item-observer-manager';
import { MapItemObserverProxyPairFactory } from '../lib/property-observer/factories/map-item/map-item-observer-proxy-pair.factory';
import { NonIterableObjectPropertyObserverProxyPairFactory } from '../lib/property-observer/factories/non-iterable-object-property';
import { ObjectPropertyObserverManager } from '../lib/property-observer/factories/non-iterable-object-property/object-property-observer-manager';
import { SetItemObserverManager } from '../lib/property-observer/factories/set-item/set-item-observer-manager';
import { SetItemObserverProxyPairFactory } from '../lib/property-observer/factories/set-item/set-item-observer-proxy-pair.factory';
import { MustProxifyItemHandlerFactory } from '../lib/property-observer/must-proxify-item-handler.factory';
import { PropertyObserverProxyPairFactoryProvider } from '../lib/property-observer/property-observer-proxy-pair-factory.provider';
import { ArrayProxyFactory } from '../lib/proxies/array-proxy/array-proxy.factory';
import { MapProxyFactory } from '../lib/proxies/map-proxy/map-proxy.factory';
import { ObservableProxyFactory } from '../lib/proxies/observable-proxy/observable-proxy.factory';
import { PromiseProxyFactory } from '../lib/proxies/promise-proxy/promise-proxy.factory';
import { ProxyRegistry } from '../lib/proxies/proxy-registry/proxy-registry';
import { SetProxyFactory } from '../lib/proxies/set-proxy/set-proxy.factory';
import { RsXStateManagerInjectionTokens } from '../lib/rs-x-state-manager-injection-tokes';
import {
   RsXStateManagerModule,
   unloadRsXStateManagerModule,
} from '../lib/rs-x-state-manager.module';
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

   it('can get an instance of IArrayItemObserverManager', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IArrayItemObserverManager
      );
      expect(actual).toBeInstanceOf(ArrayItemObserverManager);
   });

   it('IArrayItemObserverManager instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IArrayItemObserverManager
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IArrayItemObserverManager
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of IMapItemObserverManager', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IMapItemObserverManager
      );
      expect(actual).toBeInstanceOf(MapItemObserverManager);
   });

   it('IMapItemObserverManager instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IMapItemObserverManager
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IMapItemObserverManager
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of ISetItemObserverManager', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ISetItemObserverManager
      );
      expect(actual).toBeInstanceOf(SetItemObserverManager);
   });

   it('ISetItemObserverManager instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ISetItemObserverManager
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ISetItemObserverManager
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
         RsXStateManagerInjectionTokens.PlainObjectObserverProxyPairFactory
      );
      expect(actual).toBeInstanceOf(PlainObjectObserverProxyPairFactory);
   });

   it('PlainObjectObserverProxyPairFactory instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.PlainObjectObserverProxyPairFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.PlainObjectObserverProxyPairFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of ArrayItemObserverProxyPairFactory', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ArrayItemObserverProxyPairFactory
      );
      expect(actual).toBeInstanceOf(ArrayItemObserverProxyPairFactory);
   });

   it('ArrayItemObserverProxyPairFactory instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ArrayItemObserverProxyPairFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ArrayItemObserverProxyPairFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of MapItemObserverProxyPairFactory', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.MapItemObserverProxyPairFactory
      );
      expect(actual).toBeInstanceOf(MapItemObserverProxyPairFactory);
   });

   it('MapItemObserverProxyPairFactory instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.MapItemObserverProxyPairFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.MapItemObserverProxyPairFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of SetItemObserverProxyPairFactory', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.SetItemObserverProxyPairFactory
      );
      expect(actual).toBeInstanceOf(SetItemObserverProxyPairFactory);
   });

   it('SetItemObserverProxyPairFactory instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.SetItemObserverProxyPairFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.SetItemObserverProxyPairFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of IObjectStateManager', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectStateManager
      );
      expect(actual).toBeInstanceOf(ObjectStateManager);
   });

   it('IObjectStateManager instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectStateManager
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectStateManager
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of IPropertyObserverProxyPairFactoryProvider', () => {
      const actual = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryProvider
      );
      expect(actual).toBeInstanceOf(PropertyObserverProxyPairFactoryProvider);
   });

   it('IPropertyObserverProxyPairFactoryProvider instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryProvider
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryProvider
      );
      expect(a1).toBe(a2);
   });

   it('can get an instance of IPropertyObserverProxyPairFactoryProviderFactory', () => {
      const factory: () => void = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryProviderFactory
      );
      expect(factory).toBeInstanceOf(Function);

      const actual = factory();
      expect(actual).toBeInstanceOf(PropertyObserverProxyPairFactoryProvider);
   });

   it('IPropertyObserverProxyPairFactoryProviderFactory instance is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryProviderFactory
      );
      const a2 = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryProviderFactory
      );
      expect(a1).toBe(a2);
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
