import { Inject, Injectable } from '@rs-x/core';
import { isObservable, Observable } from 'rxjs';
import { IDisposableOwner } from '../../disposable-owner.interface';
import {
   IObservableObserverProxyPair,
   IObservableProxyFactory,
} from '../../proxies/observable-proxy/observable-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokes';
import { IProxyTarget } from '../object-observer-proxy-pair-manager.type';
import { IObjectObserverProxyPairFactory } from '../object-observer-proxy-pair.factory.interface';

@Injectable()
export class ObservableObserverProxyPairFactory
   implements
      IObjectObserverProxyPairFactory<Observable<unknown>>
{
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
