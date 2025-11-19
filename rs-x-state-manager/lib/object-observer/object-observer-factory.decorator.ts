import { InjectionContainer, Newable, registerMultiInjectService } from '@rs-x/core';
import { RsXStateManagerInjectionTokens } from '../rs-x-state-manager-injection-tokes';
import { IObjectObserverProxyPairFactory } from './object-observer-proxy-pair.factory.interface';


export function ObjectObserverFactory(serviceToken?: symbol) {
  return function (target: Newable<IObjectObserverProxyPairFactory>) {
    registerMultiInjectService(InjectionContainer,target, {serviceToken, multiInjectToken: RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList} )
    
  };
}