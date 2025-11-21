import {
   Inject,
   Injectable
} from '@rs-x/core';
import { IDateProxyFactory } from '../../proxies/date-proxy/date-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokes';
import { IDateObserverProxyPairFactory } from './date-observer-proxy-pair.factory.type';
import { IDisposableOwner } from '../../disposable-owner.interface';
import { IObserverProxyPair } from '../../object-property-observer-proxy-pair-manager.type';
import { IProxyTarget } from '../object-observer-proxy-pair-manager.type';

@Injectable()
export class DateObserverProxyPairFactory implements IDateObserverProxyPairFactory
{
   constructor(
      @Inject(RsXStateManagerInjectionTokens.IDateProxyFactory)
      private readonly _dateProxyFactory: IDateProxyFactory,
   
   ) {
   }
   public create(owner: IDisposableOwner, proxyTarget: IProxyTarget<Date>): IObserverProxyPair<Date, Date> {
      return this._dateProxyFactory.create({
         owner,
         date: proxyTarget.target
      }).instance;
   }

   public applies(object: object): boolean {
      return object instanceof Date;
   }
}
