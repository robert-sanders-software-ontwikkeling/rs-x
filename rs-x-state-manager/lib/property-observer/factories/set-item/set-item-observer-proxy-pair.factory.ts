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
import { ISetItemObserverManager } from './set-item-observer-manager.type';
import { IProxyRegistry } from '../../../proxies/proxy-registry/proxy-registry.interface';

@Injectable()
export class SetItemObserverProxyPairFactory extends IndexObserverProxyPairFactory<
   Set<unknown>,
   unknown
> {
   constructor(
      @Inject(RsXStateManagerInjectionTokens.IObjectObserverProxyPairManager)
      objectObserverManager: IObjectObserverProxyPairManager,
      @Inject(RsXStateManagerInjectionTokens.ISetItemObserverManager)
      setItemObserverManager: ISetItemObserverManager,
      @Inject(RsXCoreInjectionTokens.IErrorLog)
      errorLog: IErrorLog,
      @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
      indexValueAccessor: IIndexValueAccessor,
      @Inject(RsXStateManagerInjectionTokens.IProxyRegistry)
      proxyRegister: IProxyRegistry
   ) {
      super(
         objectObserverManager,
         setItemObserverManager,
         errorLog,
         indexValueAccessor,
         proxyRegister,
         truePredicate
      );
   }

   public override applies(object: unknown): boolean {
      return object instanceof Set;
   }
}
