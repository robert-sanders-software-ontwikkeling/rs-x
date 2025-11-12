import { Inject, Injectable } from '@rs-x-core';
import { RsXStateManagerInjectionTokens } from '../rs-x-state-manager-injection-tokes';
import { IObjectObserverProxyPairFactoryProvider } from './object-observer-proxy-pair-factory.provider.interface';
import { IObjectObserverProxyPairFactory } from './object-observer-proxy-pair.factory.interface';

@Injectable()
export class ObjectObserverProxyPairFactoryProvider
   implements IObjectObserverProxyPairFactoryProvider
{
   public readonly factories: readonly IObjectObserverProxyPairFactory[];

   constructor(
      @Inject(
         RsXStateManagerInjectionTokens.PlainObjectObserverProxyPairFactory
      )
      plainObjectObserverProxyPairFactory: IObjectObserverProxyPairFactory,
      @Inject(RsXStateManagerInjectionTokens.IArrayObserverProxyPairFactory)
      arrayObserverProxyPairFactory: IObjectObserverProxyPairFactory,
      @Inject(RsXStateManagerInjectionTokens.PromiseObserverProxyPairFactory)
      promiseObserverProxyPairFactory: IObjectObserverProxyPairFactory,
      @Inject(RsXStateManagerInjectionTokens.ObservableObserverProxyPairFactory)
      observableObserverProxyPairFactory: IObjectObserverProxyPairFactory,
      @Inject(RsXStateManagerInjectionTokens.IMapObserverProxyPairFactory)
      mapObserverProxyPairFactory: IObjectObserverProxyPairFactory,
      @Inject(RsXStateManagerInjectionTokens.ISetObserverProxyPairFactory)
      setObserverProxyPairFactory: IObjectObserverProxyPairFactory
   ) {
      this.factories = [
         plainObjectObserverProxyPairFactory,
         arrayObserverProxyPairFactory,
         promiseObserverProxyPairFactory,
         observableObserverProxyPairFactory,
         mapObserverProxyPairFactory,
         setObserverProxyPairFactory,
      ];
   }
}
