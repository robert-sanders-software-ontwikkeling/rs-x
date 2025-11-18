import { InjectionContainer, Newable, registerMultiInjectService } from '@rs-x/core';
import { RsXStateManagerInjectionTokens } from '../rs-x-state-manager-injection-tokes';
import { IIndexObserverProxyPairFactory } from './index-observer-proxy-pair.factory.interface';


export function IndexObserverFactory(serviceToken?: symbol) {
  return function (target: Newable<IIndexObserverProxyPairFactory>) {
    registerMultiInjectService(InjectionContainer,target, {serviceToken, multiInjectToken: RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryList} )
    
  };
}