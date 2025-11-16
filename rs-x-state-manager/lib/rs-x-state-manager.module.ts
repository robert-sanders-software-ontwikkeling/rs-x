import { ContainerModule, InjectionContainer, RsXCoreModule } from '@rs-x/core';
import { ArrayObserverProxyPairFactory } from './object-observer/factories/array-observer-proxy-pair.factory';
import { MapObserverProxyPairFactory } from './object-observer/factories/map-observer-proxy-pair.factory';
import { ObservableObserverProxyPairFactory } from './object-observer/factories/observable-observer-proxy-pair.factory';
import { PlainObjectObserverProxyPairFactory } from './object-observer/factories/plain-object-observer-proxy-pair.factory';
import { PromiseObserverProxyPairFactory } from './object-observer/factories/promise-observer-proxy-pair.factory';
import { SetObserverProxyPairFactory } from './object-observer/factories/set-observer-proxy-pair.factory';
import { ObjectObserverProxyPairFactoryProvider } from './object-observer/object-observer-proxy-pair-factory.provider';
import { IObjectObserverProxyPairFactoryProvider } from './object-observer/object-observer-proxy-pair-factory.provider.interface';
import { ObjectObserverProxyPairManager } from './object-observer/object-observer-proxy-pair-manager';
import { IObjectObserverProxyPairManager } from './object-observer/object-observer-proxy-pair-manager.type';
import { ObjectPropertyObserverProxyPairManager } from './object-property-observer-proxy-pair-manager';
import { IObjectPropertyObserverProxyPairManager } from './object-property-observer-proxy-pair-manager.type';
import { ArrayItemObserverProxyPairFactory } from './property-observer/factories/array-item/array-item-observe-proxy-pair.factory';
import { ArrayItemObserverManager } from './property-observer/factories/array-item/array-item-observer-manager';
import { IArrayItemObserverManager } from './property-observer/factories/array-item/array-item-observer-manager.type';
import { MapItemObserverManager } from './property-observer/factories/map-item/map-item-observer-manager';
import { IMapItemObserverManager } from './property-observer/factories/map-item/map-item-observer-manager.type';
import { MapItemObserverProxyPairFactory } from './property-observer/factories/map-item/map-item-observer-proxy-pair.factory';
import { NonIterableObjectPropertyObserverProxyPairFactory } from './property-observer/factories/non-iterable-object-property/non-iterable-object-property-observer-proxy-pair.factory';
import { ObjectPropertyObserverManager } from './property-observer/factories/non-iterable-object-property/object-property-observer-manager';
import { IObjectPropertyObserverManager } from './property-observer/factories/non-iterable-object-property/object-property-observer-manager.type';
import { SetItemObserverManager } from './property-observer/factories/set-item/set-item-observer-manager';
import { ISetItemObserverManager } from './property-observer/factories/set-item/set-item-observer-manager.type';
import { SetItemObserverProxyPairFactory } from './property-observer/factories/set-item/set-item-observer-proxy-pair.factory';
import { MustProxifyItemHandlerFactory } from './property-observer/must-proxify-item-handler.factory';
import { IMustProxifyItemHandlerFactory } from './property-observer/must-proxify-item-handler.factory.type';

import { ArrayProxyFactory } from './proxies/array-proxy/array-proxy.factory';
import { IArrayProxyFactory } from './proxies/array-proxy/array-proxy.factory.type';
import { MapProxyFactory } from './proxies/map-proxy/map-proxy.factory';
import { IMapProxyFactory } from './proxies/map-proxy/map-proxy.factory.type';
import { ObservableProxyFactory } from './proxies/observable-proxy/observable-proxy.factory';
import { IObservableProxyFactory } from './proxies/observable-proxy/observable-proxy.factory.type';
import { PromiseProxyFactory } from './proxies/promise-proxy/promise-proxy.factory';
import { IPromiseProxyFactory } from './proxies/promise-proxy/promise-proxy.factory.type';
import { ProxyRegistry } from './proxies/proxy-registry/proxy-registry';
import { IProxyRegistry } from './proxies/proxy-registry/proxy-registry.interface';
import { SetProxyFactory } from './proxies/set-proxy/set-proxy.factory';
import { ISetProxyFactory } from './proxies/set-proxy/set-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from './rs-x-state-manager-injection-tokes';
import { ObjectStateManager } from './state-manager/object-state-manager';
import { IObjectStateManager } from './state-manager/object-state-manager.interface';
import { StateManager } from './state-manager/state-manager';
import { IStateManager } from './state-manager/state-manager.interface';

InjectionContainer.load(RsXCoreModule);

export const RsXStateManagerModule = new ContainerModule((options) => {
   options
      .bind<IArrayProxyFactory>(
         RsXStateManagerInjectionTokens.IArrayProxyFactory
      )
      .to(ArrayProxyFactory)
      .inSingletonScope();
   options
      .bind<IMapProxyFactory>(RsXStateManagerInjectionTokens.IMapProxyFactory)
      .to(MapProxyFactory)
      .inSingletonScope();
   options
      .bind<ISetProxyFactory>(RsXStateManagerInjectionTokens.ISetProxyFactory)
      .to(SetProxyFactory)
      .inSingletonScope();
   options
      .bind<IPromiseProxyFactory>(
         RsXStateManagerInjectionTokens.IPromiseProxyFactory
      )
      .to(PromiseProxyFactory)
      .inSingletonScope();
   options
      .bind<IObservableProxyFactory>(
         RsXStateManagerInjectionTokens.IObservableProxyFactory
      )
      .to(ObservableProxyFactory)
      .inSingletonScope();
   options
      .bind<IProxyRegistry>(RsXStateManagerInjectionTokens.IProxyRegistry)
      .to(ProxyRegistry)
      .inSingletonScope();
   options
      .bind<IObjectPropertyObserverProxyPairManager>(
         RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
      )
      .to(ObjectPropertyObserverProxyPairManager)
      .inSingletonScope();


   options.bind(PlainObjectObserverProxyPairFactory).to(PlainObjectObserverProxyPairFactory).inSingletonScope();
   options.bind(ArrayObserverProxyPairFactory).to(ArrayObserverProxyPairFactory).inSingletonScope();
   options.bind(PromiseObserverProxyPairFactory).to(PromiseObserverProxyPairFactory).inSingletonScope();
   options.bind(ObservableObserverProxyPairFactory).to(ObservableObserverProxyPairFactory).inSingletonScope();
   options.bind(MapObserverProxyPairFactory).to(MapObserverProxyPairFactory).inSingletonScope();
   options.bind(SetObserverProxyPairFactory).to(SetObserverProxyPairFactory).inSingletonScope();

   options.bind(RsXStateManagerInjectionTokens.PlainObjectObserverProxyPairFactory).toService(PlainObjectObserverProxyPairFactory);
   options.bind(RsXStateManagerInjectionTokens.IArrayObserverProxyPairFactory).toService(ArrayObserverProxyPairFactory);
   options.bind(RsXStateManagerInjectionTokens.PromiseObserverProxyPairFactory).toService(PromiseObserverProxyPairFactory);
   options.bind(RsXStateManagerInjectionTokens.ObservableObserverProxyPairFactory).toService(ObservableObserverProxyPairFactory);
   options.bind(RsXStateManagerInjectionTokens.IMapObserverProxyPairFactory).toService(MapObserverProxyPairFactory);
   options.bind(RsXStateManagerInjectionTokens.ISetObserverProxyPairFactory).toService(SetObserverProxyPairFactory);

   options.bind(RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList).toService(PlainObjectObserverProxyPairFactory);
   options.bind(RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList).toService(ArrayObserverProxyPairFactory);
   options.bind(RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList ).toService(PromiseObserverProxyPairFactory);
   options.bind(RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList).toService(ObservableObserverProxyPairFactory);
   options.bind(RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList).toService(MapObserverProxyPairFactory);
   options.bind(RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList).toService(SetObserverProxyPairFactory);
   
   options
      .bind<IObjectObserverProxyPairFactoryProvider>(
         RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryProvider
      )
      .to(ObjectObserverProxyPairFactoryProvider)
      .inSingletonScope();
   options
      .bind<IObjectObserverProxyPairManager>(
         RsXStateManagerInjectionTokens.IObjectObserverProxyPairManager
      )
      .to(ObjectObserverProxyPairManager)
      .inSingletonScope();
   options
      .bind<IObjectPropertyObserverManager>(
         RsXStateManagerInjectionTokens.IObjectPropertyObserverManager
      )
      .to(ObjectPropertyObserverManager)
      .inSingletonScope();
   options
      .bind<IArrayItemObserverManager>(
         RsXStateManagerInjectionTokens.IArrayItemObserverManager
      )
      .to(ArrayItemObserverManager)
      .inSingletonScope();
   options
      .bind<IMapItemObserverManager>(
         RsXStateManagerInjectionTokens.IMapItemObserverManager
      )
      .to(MapItemObserverManager)
      .inSingletonScope();
   options
      .bind<ISetItemObserverManager>(
         RsXStateManagerInjectionTokens.ISetItemObserverManager
      )
      .to(SetItemObserverManager)
      .inSingletonScope();


   options.bind(NonIterableObjectPropertyObserverProxyPairFactory).to(NonIterableObjectPropertyObserverProxyPairFactory).inSingletonScope();
   options.bind(ArrayItemObserverProxyPairFactory).to(ArrayItemObserverProxyPairFactory).inSingletonScope();
   options.bind(MapItemObserverProxyPairFactory).to(MapItemObserverProxyPairFactory).inSingletonScope();
   options.bind(SetItemObserverProxyPairFactory).to(SetItemObserverProxyPairFactory).inSingletonScope();
  
   options.bind(RsXStateManagerInjectionTokens.NonIterableObjectPropertyObserverProxyPairFactory).toService(NonIterableObjectPropertyObserverProxyPairFactory);
   options.bind(RsXStateManagerInjectionTokens.ArrayItemObserverProxyPairFactory).toService(ArrayItemObserverProxyPairFactory)
   options.bind(RsXStateManagerInjectionTokens.MapItemObserverProxyPairFactory).toService(MapItemObserverProxyPairFactory)
   options.bind(RsXStateManagerInjectionTokens.SetItemObserverProxyPairFactory).toService(SetItemObserverProxyPairFactory);
     
   options.bind(RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryList).toService(NonIterableObjectPropertyObserverProxyPairFactory);
   options.bind(RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryList).toService(ArrayItemObserverProxyPairFactory)
   options.bind(RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryList).toService(MapItemObserverProxyPairFactory)
   options.bind(RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryList).toService(SetItemObserverProxyPairFactory)
    

   options
      .bind<IMustProxifyItemHandlerFactory>(
         RsXStateManagerInjectionTokens.IMustProxifyItemHandlerFactory
      )
      .to(MustProxifyItemHandlerFactory)
      .inSingletonScope();

   options
      .bind<IObjectStateManager>(
         RsXStateManagerInjectionTokens.IObjectStateManager
      )
      .to(ObjectStateManager)
      .inSingletonScope();
   options
      .bind<
         () => IObjectObserverProxyPairFactoryProvider
      >(RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryProviderFactory)
      .toFactory((context) => {
         return () =>
            context.get(
               RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryProvider
            );
      });
   options
      .bind<IStateManager>(RsXStateManagerInjectionTokens.IStateManager)
      .to(StateManager)
      .inSingletonScope();

   
});

export async function unloadRsXStateManagerModule(): Promise<void> {
   await InjectionContainer.unload(RsXStateManagerModule);
   await InjectionContainer.unload(RsXCoreModule);
}
