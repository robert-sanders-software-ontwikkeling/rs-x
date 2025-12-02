import {
   IErrorLog,
   IIndexValueAccessor,
   Inject,
   Injectable,
   RsXCoreInjectionTokens,
   truePredicate,
} from '@rs-x/core';
import { IObjectObserverProxyPairManager } from '../../../object-observer/object-observer-proxy-pair-manager.type';
import { RsXStateManagerInjectionTokens } from '../../../rs-x-state-manager-injection-tokes';
import { IndexObserverProxyPairFactory } from '../indexed-value-observer-proxy-pair/indexed-value-observer-proxy-pair.factory';
import { IMapItemObserverManager } from './map-item-observer-manager.type';
import { IProxyRegistry } from '../../../proxies/proxy-registry/proxy-registry.interface';

@Injectable()
export class MapItemObserverProxyPairFactory extends IndexObserverProxyPairFactory<
   Map<unknown, unknown>,
   unknown
> {
   constructor(
      @Inject(RsXStateManagerInjectionTokens.IObjectObserverProxyPairManager)
      objectObserverManager: IObjectObserverProxyPairManager,
      @Inject(RsXStateManagerInjectionTokens.IMapItemObserverManager)
      mapItemObserverManager: IMapItemObserverManager,
      @Inject(RsXCoreInjectionTokens.IErrorLog)
      errorLog: IErrorLog,
      @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
      indexValueAccessor: IIndexValueAccessor,
      @Inject(RsXStateManagerInjectionTokens.IProxyRegistry)
      proxyRegister: IProxyRegistry
   ) {
      super(
         objectObserverManager,
         mapItemObserverManager,
         errorLog,
         indexValueAccessor,
         proxyRegister,
         truePredicate
      );
   }

   public override applies(object: unknown): boolean {
      return object instanceof Map;
   }
}
