import {
   IDisposableOwner,
   Inject,
   Injectable
} from '@rs-x/core';
import { IDateProxyFactory } from '../../proxies/date-proxy/date-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokes';
import { IProxyTarget } from '../object-observer-proxy-pair-manager.type';
import { IDateObserverProxyPairFactory, IDateOserverProxyPair } from './date-observer-proxy-pair.factory.type';

@Injectable()
export class DateObserverProxyPairFactory implements IDateObserverProxyPairFactory
{
   constructor(
      @Inject(RsXStateManagerInjectionTokens.IDateProxyFactory)
      private readonly _dateProxyFactory: IDateProxyFactory,
   
   ) {
   }
   
   public create(owner: IDisposableOwner, proxyTarget: IProxyTarget<Date>): IDateOserverProxyPair {
      return this._dateProxyFactory.create({
         owner,
         date: proxyTarget.target
      }).instance;
   }

   public applies(object: object): boolean {
      return object instanceof Date;
   }
}
