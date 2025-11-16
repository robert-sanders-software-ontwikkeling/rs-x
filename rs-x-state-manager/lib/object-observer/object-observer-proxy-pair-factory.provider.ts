import { Injectable, MultiInject } from '@rs-x/core';
import { RsXStateManagerInjectionTokens } from '../rs-x-state-manager-injection-tokes';
import { IObjectObserverProxyPairFactoryProvider } from './object-observer-proxy-pair-factory.provider.interface';
import { IObjectObserverProxyPairFactory } from './object-observer-proxy-pair.factory.interface';

@Injectable()
export class ObjectObserverProxyPairFactoryProvider
   implements IObjectObserverProxyPairFactoryProvider
{
   constructor(
      @MultiInject(RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList)
      public readonly factories: readonly IObjectObserverProxyPairFactory[]
   ) {
      
   }
}
