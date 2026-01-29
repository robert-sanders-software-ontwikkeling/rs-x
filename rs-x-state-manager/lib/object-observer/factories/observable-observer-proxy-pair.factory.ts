import { isObservable, Observable } from 'rxjs';

import { type IDisposableOwner, Inject, Injectable } from '@rs-x/core';

import type {
   IObservableObserverProxyPair,
   IObservableProxyFactory,
} from '../../proxies/observable-proxy/observable-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokes';
import type { IObjectObserverProxyPairFactory } from '../object-observer-proxy-pair.factory.interface';
import type { IProxyTarget } from '../object-observer-proxy-pair-manager.type';

@Injectable()
export class ObservableObserverProxyPairFactory
   implements
      IObjectObserverProxyPairFactory<Observable<unknown>>
{

   public readonly priority = 3;

   constructor(
      @Inject(RsXStateManagerInjectionTokens.IObservableProxyFactory)
      private readonly _observableProxyFactory: IObservableProxyFactory
   ) {}

   public create(
      owner: IDisposableOwner,
      objectObserverInfo: IProxyTarget<Observable<unknown>>
   ): IObservableObserverProxyPair {
      return this._observableProxyFactory.create({
         observable: objectObserverInfo.target,
         owner,
      }).instance;
   }

   public applies(object: unknown): boolean {
      return isObservable(object);
   }
}
