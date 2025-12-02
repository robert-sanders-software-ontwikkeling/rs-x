import {
   IErrorLog,
   IIndexValueAccessor,
   Inject,
   Injectable,
   RsXCoreInjectionTokens,
   truePredicate,
   Type,
} from '@rs-x/core';
import { IObjectObserverProxyPairManager } from '../../../object-observer/object-observer-proxy-pair-manager.type';
import {
   IPropertyInfo,
   MustProxify,
} from '../../../object-property-observer-proxy-pair-manager.type';
import { RsXStateManagerInjectionTokens } from '../../../rs-x-state-manager-injection-tokes';
import { IndexObserverProxyPairFactory } from '../indexed-value-observer-proxy-pair/indexed-value-observer-proxy-pair.factory';
import { IArrayItemObserverManager } from './array-item-observer-manager.type';
import { IProxyRegistry } from '../../../proxies/proxy-registry/proxy-registry.interface';

@Injectable()
export class ArrayItemObserverProxyPairFactory extends IndexObserverProxyPairFactory<
   unknown[],
   number | MustProxify
> {
   constructor(
      @Inject(RsXStateManagerInjectionTokens.IObjectObserverProxyPairManager)
      objectObserverManager: IObjectObserverProxyPairManager,
      @Inject(RsXStateManagerInjectionTokens.IArrayItemObserverManager)
      arrayItemObserverManager: IArrayItemObserverManager,
      @Inject(RsXCoreInjectionTokens.IErrorLog)
      errorLog: IErrorLog,
      @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
      indexValueAccessor: IIndexValueAccessor,
      @Inject(RsXStateManagerInjectionTokens.IProxyRegistry)
      proxyRegister: IProxyRegistry
   ) {
      super(
         objectObserverManager,
         arrayItemObserverManager,
         errorLog,
         indexValueAccessor,
         proxyRegister,
         truePredicate
      );
   }

   public override applies(
      object: unknown,
      propertyInfo: IPropertyInfo
   ): boolean {
      return Array.isArray(object) && Type.isPositiveInteger(propertyInfo.key);
   }
}
