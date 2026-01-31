import { type IDisposableOwner, Inject, Injectable } from '@rs-x/core';

import type {
   IPromiseObserverProxyPair,
   IPromiseProxyFactory,
} from '../../proxies/promise-proxy/promise-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokens';
import type { IObjectObserverProxyPairFactory } from '../object-observer-proxy-pair.factory.interface';
import type { IProxyTarget } from '../object-observer-proxy-pair-manager.type';

@Injectable()
export class PromiseObserverProxyPairFactory
   implements
   IObjectObserverProxyPairFactory<Promise<unknown>> {

   public readonly priority = 4;
   
   constructor(
      @Inject(RsXStateManagerInjectionTokens.IPromiseProxyFactory)
      private readonly _promiseProxyFactory: IPromiseProxyFactory
   ) { }

   public create(
      owner: IDisposableOwner,
      proxyTarget: IProxyTarget<Promise<unknown>>
   ): IPromiseObserverProxyPair {
      return this._promiseProxyFactory.create({
         promise: proxyTarget.target,
         owner,
      }).instance;
   }

   public applies(object: unknown): boolean {
      return object instanceof Promise;
   }
}
