import {
   IErrorLog,
   IMapKeyAccessor,
   Inject,
   Injectable,
   RsXCoreInjectionTokens,
} from '@rs-x/core';
import {
   IMapObserverProxyPair,
   IMapProxyFactory
} from '../../proxies/map-proxy/map-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokes';
import { IProxyTarget } from '../object-observer-proxy-pair-manager.type';
import { IMapObserverProxyPairFactory } from './map-observer-proxy-pair.factory.type';
import { ObjectObserverProxyPairFactory } from './object-observer-proxy-pair.factory';
import { IObjectPropertyObserverProxyPairManager } from '../../object-property-observer-proxy-pair-manager.type';

@Injectable()
export class MapObserverProxyPairFactory
   extends ObjectObserverProxyPairFactory<Map<unknown, unknown>>
   implements IMapObserverProxyPairFactory {


   constructor(
      @Inject(RsXStateManagerInjectionTokens.IMapProxyFactory)
      private readonly _mapProxyFactory: IMapProxyFactory,
      @Inject(RsXCoreInjectionTokens.IErrorLog)
      errorLog: IErrorLog,
      @Inject(RsXCoreInjectionTokens.IMapKeyAccessor)
      mapKeyAccessor: IMapKeyAccessor,
      @Inject(RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager)
      objectPropertyObserverProxyPairManager: IObjectPropertyObserverProxyPairManager

   ) {
      super(true,errorLog,mapKeyAccessor, objectPropertyObserverProxyPairManager);
   }

   public override applies(object: unknown): boolean {
      return object instanceof Map;
   }

   protected override createRootObserver(data: IProxyTarget<Map<unknown, unknown>>): IMapObserverProxyPair {
      return this._mapProxyFactory.create({
         map: data.target,
      }).instance;
   }
}
