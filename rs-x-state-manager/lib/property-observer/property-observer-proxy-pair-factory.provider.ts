import { Inject, Injectable } from '@rs-x/core';
import { RsXStateManagerInjectionTokens } from '../rs-x-state-manager-injection-tokes';
import { IPropertyObserverProxyPairFactoryProvider } from './property-observer-proxy-factory.provider.interface';
import { IPropertyObserverProxyPairFactory } from './property-observer-proxy-pair.factory.interface';

@Injectable()
export class PropertyObserverProxyPairFactoryProvider
   implements IPropertyObserverProxyPairFactoryProvider
{
   public readonly factories: readonly IPropertyObserverProxyPairFactory[];

   constructor(
      @Inject(
         RsXStateManagerInjectionTokens.NonIterableObjectPropertyObserverProxyPairFactory
      )
      nonIterableObjectPropertyObserverProxyPairFactory: IPropertyObserverProxyPairFactory,
      @Inject(RsXStateManagerInjectionTokens.ArrayItemObserverProxyPairFactory)
      arrayItemObserverProxyPairFactory: IPropertyObserverProxyPairFactory,
      @Inject(RsXStateManagerInjectionTokens.MapItemObserverProxyPairFactory)
      mapItemObserverProxyPairFactory: IPropertyObserverProxyPairFactory,
      @Inject(RsXStateManagerInjectionTokens.SetItemObserverProxyPairFactory)
      setItemObserverProxyPairFactory: IPropertyObserverProxyPairFactory
   ) {
      this.factories = [
         nonIterableObjectPropertyObserverProxyPairFactory,
         arrayItemObserverProxyPairFactory,
         mapItemObserverProxyPairFactory,
         setItemObserverProxyPairFactory,
      ];
   }
}
