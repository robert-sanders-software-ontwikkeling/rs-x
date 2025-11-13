import {
   IErrorLog,
   Inject,
   Injectable,
   replaceSetItemAt,
   RsXCoreInjectionTokens,
} from '@rs-x/core';
import { IObjectPropertyObserverProxyPairManager } from '../../object-property-observer-proxy-pair-manager.type';
import { IMustProxifyItemHandlerFactory } from '../../property-observer/must-proxify-item-handler.factory.type';
import { IProxyRegistry } from '../../proxies/proxy-registry/proxy-registry.interface';
import {
   ISetObserverProxyPair,
   ISetProxyFactory,
} from '../../proxies/set-proxy/set-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokes';
import { IProxyTarget } from '../object-observer-proxy-pair-manager.type';
import {
   CollectionObserverProxyPairFactory,
   ProcessItem,
} from './collection-observer-proxy-pair.factory';
import { ISetObserverProxyPairFactory } from './set-observer-proxy-pair.factory.type';

@Injectable()
export class SetObserverProxyPairFactory
   extends CollectionObserverProxyPairFactory<Set<unknown>>
   implements ISetObserverProxyPairFactory
{
   constructor(
      @Inject(RsXStateManagerInjectionTokens.ISetProxyFactory)
      private readonly _setProxyFactory: ISetProxyFactory,
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
      return object instanceof Set;
   }

   protected override createCollectionObserver(
      data: IProxyTarget<Set<unknown>>,
      proxifyItem: ProcessItem<Set<unknown>, unknown>,
      unproxifyItem: ProcessItem<Set<unknown>, unknown>
   ): ISetObserverProxyPair {
      return this._setProxyFactory.create({
         set: data.target,
         mustProxify: data.mustProxify,
         proxifyItem,
         unproxifyItem,
      }).instance;
   }

   protected override restoreOrginalItem(
      set: Set<unknown>,
      itemProxy: unknown,
      item: unknown,
      unproxifyItem: ProcessItem<Set<unknown>, unknown>
   ): void {
      const unproxifiedItem = unproxifyItem(item, set);
      if (itemProxy !== item) {
         replaceSetItemAt(set, itemProxy, unproxifiedItem);
      }
   }
}
