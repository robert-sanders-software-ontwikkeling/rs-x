import {
   IErrorLog,
   Inject,
   Injectable,
   RsXCoreInjectionTokens,
} from '@rs-x/core';
import {
   IObjectPropertyObserverProxyPairManager,
   IObserverProxyPair,
} from '../../object-property-observer-proxy-pair-manager.type';
import { IMustProxifyItemHandlerFactory } from '../../property-observer/must-proxify-item-handler.factory.type';
import { IArrayProxyFactory } from '../../proxies/array-proxy/array-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokes';
import { IProxyTarget } from '../object-observer-proxy-pair-manager.type';
import { IArrayObserverProxyPairFactory } from './array-observer-proxy-pair.factory.type';
import {
   CollectionObserverProxyPairFactory,
   ProcessItem,
} from './collection-observer-proxy-pair.factory';
import { IProxyRegistry } from '../../proxies/proxy-registry/proxy-registry.interface';

@Injectable()
export class ArrayObserverProxyPairFactory
   extends CollectionObserverProxyPairFactory<unknown[], number, string>
   implements IArrayObserverProxyPairFactory
{
   constructor(
      @Inject(RsXStateManagerInjectionTokens.IArrayProxyFactory)
      private readonly _arrayProxyFactory: IArrayProxyFactory,
      @Inject(
         RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
      )
      objectPropertyObserverProxyPairManager: IObjectPropertyObserverProxyPairManager,
      @Inject(RsXCoreInjectionTokens.IErrorLog)
      errorLog: IErrorLog,
      @Inject(RsXStateManagerInjectionTokens.IMustProxifyItemHandlerFactory)
      mustProxifyItemHandlerFactory: IMustProxifyItemHandlerFactory,
      @Inject(RsXStateManagerInjectionTokens.IProxyRegistry)
      proxyRegistry: IProxyRegistry
   ) {
      super(
         objectPropertyObserverProxyPairManager,
         errorLog,
         mustProxifyItemHandlerFactory,
         proxyRegistry
      );
   }

   public override applies(object: object): boolean {
      return Array.isArray(object);
   }

   protected override createCollectionObserver(
      data: IProxyTarget<unknown[]>,
      proxifyItem: ProcessItem<unknown[], number>,
      unproxifyItem: ProcessItem<unknown[], number>
   ): IObserverProxyPair<unknown[], string> {
      return this._arrayProxyFactory.create({
         array: data.target,
         mustProxify: data.mustProxify,
         proxifyItem,
         unproxifyItem,
      }).instance;
   }
}
