import { ContainerModule, InjectionContainer, registerMultiInjectServices, RsXCoreModule } from '@rs-x/core';
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

   registerMultiInjectServices(options, RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList,
      [
         { target: PlainObjectObserverProxyPairFactory, token: RsXStateManagerInjectionTokens.PlainObjectObserverProxyPairFactory },
         { target: ArrayObserverProxyPairFactory, token: RsXStateManagerInjectionTokens.IArrayObserverProxyPairFactory },
         { target: PromiseObserverProxyPairFactory, token: RsXStateManagerInjectionTokens.PromiseObserverProxyPairFactory },
         { target: ObservableObserverProxyPairFactory, token: RsXStateManagerInjectionTokens.ObservableObserverProxyPairFactory },
         { target: MapObserverProxyPairFactory, token: RsXStateManagerInjectionTokens.IMapObserverProxyPairFactory },
         { target: SetObserverProxyPairFactory, token: RsXStateManagerInjectionTokens.ISetObserverProxyPairFactory },
      ]
   );

   registerMultiInjectServices(options, RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryList,
      [
         { target: NonIterableObjectPropertyObserverProxyPairFactory, token: RsXStateManagerInjectionTokens.NonIterableObjectPropertyObserverProxyPairFactory },
         { target: ArrayItemObserverProxyPairFactory, token: RsXStateManagerInjectionTokens.ArrayItemObserverProxyPairFactory },
         { target: MapItemObserverProxyPairFactory, token: RsXStateManagerInjectionTokens.MapItemObserverProxyPairFactory },
         { target: SetItemObserverProxyPairFactory, token: RsXStateManagerInjectionTokens.SetItemObserverProxyPairFactory },
      ]
   );

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
