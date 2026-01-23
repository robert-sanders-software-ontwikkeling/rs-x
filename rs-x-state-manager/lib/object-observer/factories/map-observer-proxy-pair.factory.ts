import {
   type IErrorLog,
   type IMapKeyAccessor,
   Inject,
   Injectable,
   RsXCoreInjectionTokens,
} from '@rs-x/core';
import type { IObjectPropertyObserverProxyPairManager } from '../../object-property-observer-proxy-pair-manager.type';
import type {
   IMapObserverProxyPair,
   IMapProxyFactory
} from '../../proxies/map-proxy/map-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokes';
import type { IProxyTarget } from '../object-observer-proxy-pair-manager.type';
import { AbstractObjectObserverProxyPairFactory } from './abstract-object-observer-proxy-pair.factory';
import type { IMapObserverProxyPairFactory } from './map-observer-proxy-pair.factory.type';

@Injectable()
export class MapObserverProxyPairFactory
   extends AbstractObjectObserverProxyPairFactory<Map<unknown, unknown>>
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
      super(2, true, errorLog, mapKeyAccessor, objectPropertyObserverProxyPairManager);
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
