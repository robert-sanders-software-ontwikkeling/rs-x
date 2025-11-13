import { Inject, Injectable } from '@rs-x/core';
import { IDisposableOwner } from '../../disposable-owner.interface';
import {
   IPromiseObserverProxyPair,
   IPromiseProxyFactory,
} from '../../proxies/promise-proxy/promise-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokes';
import { IProxyTarget } from '../object-observer-proxy-pair-manager.type';
import { IObjectObserverProxyPairFactory } from '../object-observer-proxy-pair.factory.interface';

@Injectable()
export class PromiseObserverProxyPairFactory
   implements
      IObjectObserverProxyPairFactory<Promise<unknown>, Promise<unknown>>
{
   constructor(
      @Inject(RsXStateManagerInjectionTokens.IPromiseProxyFactory)
      private readonly _promiseProxyFactory: IPromiseProxyFactory
   ) {}

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
