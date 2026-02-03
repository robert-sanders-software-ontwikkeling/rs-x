import {
  ContainerModule,
  type IMultiInjectService,
  InjectionContainer,
  registerMultiInjectServices,
  RsXCoreModule,
} from '@rs-x/core';

import { IndexWatchRuleRegistry } from './index-watch-rule-registry/index-watch-rule-registry';
import type { IIndexWatchRuleRegistry } from './index-watch-rule-registry/index-watch-rule-registry.type';
import { ArrayObserverProxyPairFactory } from './object-observer/factories/array-observer-proxy-pair.factory';
import { DateObserverProxyPairFactory } from './object-observer/factories/date-observer-proxy-pair.factory';
import { MapObserverProxyPairFactory } from './object-observer/factories/map-observer-proxy-pair.factory';
import { ObservableObserverProxyPairFactory } from './object-observer/factories/observable-observer-proxy-pair.factory';
import { PlainObjectObserverProxyPairFactory } from './object-observer/factories/plain-object-observer-proxy-pair.factory';
import { PromiseObserverProxyPairFactory } from './object-observer/factories/promise-observer-proxy-pair.factory';
import { SetObserverProxyPairFactory } from './object-observer/factories/set-observer-proxy-pair.factory';
import { ObjectObserverProxyPairFactoryProvider } from './object-observer/object-observer-proxy-pair-factory.provider';
import { type IObjectObserverProxyPairFactoryProvider } from './object-observer/object-observer-proxy-pair-factory.provider.interface';
import { ObjectObserverProxyPairManager } from './object-observer/object-observer-proxy-pair-manager';
import { type IObjectObserverProxyPairManager } from './object-observer/object-observer-proxy-pair-manager.type';
import { CollectionItemObserverManager } from './property-observer/factories/collection-item/collection-item-observer-manager';
import { type ICollectionItemObserverManager } from './property-observer/factories/collection-item/collection-item-observer-manager.type';
import { CollectionItemObserverProxyPairFactory } from './property-observer/factories/collection-item/collection-item-observer-proxy-pair.factory';
import { DatePropertyObserverManager } from './property-observer/factories/date-property/data-property-observer-manager';
import { type IDatePropertyObserverManager } from './property-observer/factories/date-property/date-property-observer-manager.type';
import { DatePropertyObserverProxyPairFactory } from './property-observer/factories/date-property/date-property-observer-proxy-pair.factory';
import { NonIterableObjectPropertyObserverProxyPairFactory } from './property-observer/factories/non-iterable-object-property/non-iterable-object-property-observer-proxy-pair.factory';
import { ObjectPropertyObserverManager } from './property-observer/factories/non-iterable-object-property/object-property-observer-manager';
import { type IObjectPropertyObserverManager } from './property-observer/factories/non-iterable-object-property/object-property-observer-manager.type';
import { ArrayProxyFactory } from './proxies/array-proxy/array-proxy.factory';
import { type IArrayProxyFactory } from './proxies/array-proxy/array-proxy.factory.type';
import { DateProxyFactory } from './proxies/date-proxy/date-proxy.factory';
import { type IDateProxyFactory } from './proxies/date-proxy/date-proxy.factory.type';
import { MapProxyFactory } from './proxies/map-proxy/map-proxy.factory';
import { type IMapProxyFactory } from './proxies/map-proxy/map-proxy.factory.type';
import { ObservableProxyFactory } from './proxies/observable-proxy/observable-proxy.factory';
import { type IObservableProxyFactory } from './proxies/observable-proxy/observable-proxy.factory.type';
import { PromiseProxyFactory } from './proxies/promise-proxy/promise-proxy.factory';
import { type IPromiseProxyFactory } from './proxies/promise-proxy/promise-proxy.factory.type';
import { ProxyRegistry } from './proxies/proxy-registry/proxy-registry';
import { type IProxyRegistry } from './proxies/proxy-registry/proxy-registry.interface';
import { SetProxyFactory } from './proxies/set-proxy/set-proxy.factory';
import { type ISetProxyFactory } from './proxies/set-proxy/set-proxy.factory.type';
import { ObjectStateManager } from './state-manager/object-state-manager';
import { type IObjectStateManager } from './state-manager/object-state-manager.interface';
import { StateManager } from './state-manager/state-manager';
import { type IStateManager } from './state-manager/state-manager.interface';
import { ObjectPropertyObserverProxyPairManager } from './object-property-observer-proxy-pair-manager';
import { type IObjectPropertyObserverProxyPairManager } from './object-property-observer-proxy-pair-manager.type';
import { RsXStateManagerInjectionTokens } from './rs-x-state-manager-injection-tokens';

export const defaultObjectObserverProxyPairFactoryList: readonly IMultiInjectService[] =
  [
    {
      target: PlainObjectObserverProxyPairFactory,
      token:
        RsXStateManagerInjectionTokens.IPlainObjectObserverProxyPairFactory,
    },
    {
      target: DateObserverProxyPairFactory,
      token: RsXStateManagerInjectionTokens.IDateObserverProxyPairFactory,
    },
    {
      target: ArrayObserverProxyPairFactory,
      token: RsXStateManagerInjectionTokens.IArrayObserverProxyPairFactory,
    },
    {
      target: PromiseObserverProxyPairFactory,
      token: RsXStateManagerInjectionTokens.PromiseObserverProxyPairFactory,
    },
    {
      target: ObservableObserverProxyPairFactory,
      token: RsXStateManagerInjectionTokens.ObservableObserverProxyPairFactory,
    },
    {
      target: MapObserverProxyPairFactory,
      token: RsXStateManagerInjectionTokens.IMapObserverProxyPairFactory,
    },
    {
      target: SetObserverProxyPairFactory,
      token: RsXStateManagerInjectionTokens.ISetObserverProxyPairFactory,
    },
  ];

export const defaultPropertyObserverProxyPairFactoryList: readonly IMultiInjectService[] =
  [
    {
      target: NonIterableObjectPropertyObserverProxyPairFactory,
      token:
        RsXStateManagerInjectionTokens.NonIterableObjectPropertyObserverProxyPairFactory,
    },
    {
      target: CollectionItemObserverProxyPairFactory,
      token:
        RsXStateManagerInjectionTokens.ICollectionItemObserverProxyPairFactory,
    },
    {
      target: DatePropertyObserverProxyPairFactory,
      token:
        RsXStateManagerInjectionTokens.IDatePropertyObserverProxyPairFactory,
    },
  ];

InjectionContainer.load(RsXCoreModule);

export const RsXStateManagerModule = new ContainerModule((options) => {
  options
    .bind<IArrayProxyFactory>(RsXStateManagerInjectionTokens.IArrayProxyFactory)
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
    .bind<IDateProxyFactory>(RsXStateManagerInjectionTokens.IDateProxyFactory)
    .to(DateProxyFactory)
    .inSingletonScope();
  options
    .bind<IPromiseProxyFactory>(
      RsXStateManagerInjectionTokens.IPromiseProxyFactory,
    )
    .to(PromiseProxyFactory)
    .inSingletonScope();
  options
    .bind<IObservableProxyFactory>(
      RsXStateManagerInjectionTokens.IObservableProxyFactory,
    )
    .to(ObservableProxyFactory)
    .inSingletonScope();
  options
    .bind<IProxyRegistry>(RsXStateManagerInjectionTokens.IProxyRegistry)
    .to(ProxyRegistry)
    .inSingletonScope();
  options
    .bind<IObjectPropertyObserverProxyPairManager>(
      RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager,
    )
    .to(ObjectPropertyObserverProxyPairManager)
    .inSingletonScope();
  registerMultiInjectServices(
    options,
    RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList,
    defaultObjectObserverProxyPairFactoryList,
  );
  registerMultiInjectServices(
    options,
    RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryList,
    defaultPropertyObserverProxyPairFactoryList,
  );
  options
    .bind<IObjectObserverProxyPairFactoryProvider>(
      RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryProvider,
    )
    .to(ObjectObserverProxyPairFactoryProvider)
    .inSingletonScope();
  options
    .bind<IObjectObserverProxyPairManager>(
      RsXStateManagerInjectionTokens.IObjectObserverProxyPairManager,
    )
    .to(ObjectObserverProxyPairManager)
    .inSingletonScope();
  options
    .bind<IObjectPropertyObserverManager>(
      RsXStateManagerInjectionTokens.IObjectPropertyObserverManager,
    )
    .to(ObjectPropertyObserverManager)
    .inSingletonScope();
  options
    .bind<ICollectionItemObserverManager>(
      RsXStateManagerInjectionTokens.ICollectionItemObserverManager,
    )
    .to(CollectionItemObserverManager)
    .inSingletonScope();
  options
    .bind<IDatePropertyObserverManager>(
      RsXStateManagerInjectionTokens.IDatePropertyObserverManager,
    )
    .to(DatePropertyObserverManager)
    .inSingletonScope();
  options
    .bind<IIndexWatchRuleRegistry>(
      RsXStateManagerInjectionTokens.IIndexWatchRuleRegistry,
    )
    .to(IndexWatchRuleRegistry)
    .inSingletonScope();
  options
    .bind<IObjectStateManager>(
      RsXStateManagerInjectionTokens.IObjectStateManager,
    )
    .to(ObjectStateManager)
    .inTransientScope();
  options
    .bind<
      () => IObjectObserverProxyPairFactoryProvider
    >(RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryProviderFactory)
    .toFactory((context) => {
      return () =>
        context.get(
          RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryProvider,
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
