import {
   IErrorLog,
   Inject,
   Injectable,
   RsXCoreInjectionTokens,
} from '@rs-x/core';
import { IObjectPropertyObserverProxyPairManager } from '../../object-property-observer-proxy-pair-manager.type';
import { IMustProxifyItemHandlerFactory } from '../../property-observer/must-proxify-item-handler.factory.type';
import {
   IMapObserverProxyPair,
   IMapProxyFactory,
} from '../../proxies/map-proxy/map-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokes';
import { IProxyTarget } from '../object-observer-proxy-pair-manager.type';
import {
   CollectionObserverProxyPairFactory,
   ProcessItem,
} from './collection-observer-proxy-pair.factory';
import { IMapObserverProxyPairFactory } from './map-observer-proxy-pair.factory.type';
import { IProxyRegistry } from '../../proxies/proxy-registry/proxy-registry.interface';

@Injectable()
export class MapObserverProxyPairFactory
   extends CollectionObserverProxyPairFactory<Map<unknown, unknown>>
   implements IMapObserverProxyPairFactory
{
   constructor(
      @Inject(RsXStateManagerInjectionTokens.IMapProxyFactory)
      private readonly _mapProxyFactory: IMapProxyFactory,
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

   public override applies(object: unknown): boolean {
      return object instanceof Map;
   }

   protected override createCollectionObserver(
      data: IProxyTarget<Map<unknown, unknown>>,
      proxifyItem: ProcessItem<Map<unknown, unknown>, unknown>,
      unproxifyItem: ProcessItem<Map<unknown, unknown>, unknown>
   ): IMapObserverProxyPair {
      return this._mapProxyFactory.create({
         map: data.target,
         mustProxify: data.mustProxify,
         proxifyItem,
         unproxifyItem,
      }).instance;
   }
}
