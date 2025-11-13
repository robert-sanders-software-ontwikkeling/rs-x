import { Assertion, IErrorLog } from '@rs-x/core';
import { IDisposableOwner } from '../../disposable-owner.interface';
import {
   IObjectPropertyObserverProxyPairManager,
   IObserverProxyPair,
   MustProxify,
} from '../../object-property-observer-proxy-pair-manager.type';
import { ObserverGroup } from '../../observer-group';
import { IMustProxifyItemHandlerFactory } from '../../property-observer/must-proxify-item-handler.factory.type';
import { IProxyRegistry } from '../../proxies/proxy-registry/proxy-registry.interface';
import { IProxyTarget } from '../object-observer-proxy-pair-manager.type';
import { ObjectObserverProxyPairFactory } from './object-observer-proxy-pair.factory';

export type ProcessItem<TTarget, TIndex> = (
   item: unknown,
   collection: TTarget,
   index?: TIndex
) => unknown;

export abstract class CollectionObserverProxyPairFactory<
   TTarget,
   TIndex = unknown,
   TId = string,
> extends ObjectObserverProxyPairFactory<TTarget, TId> {
   private readonly _observerGroups = new Map<TTarget, ObserverGroup>();

   protected constructor(
      private readonly _objectPropertyObserverProxyPairManager: IObjectPropertyObserverProxyPairManager,
      errorLog: IErrorLog,
      private readonly _mustProxifyItemHandlerFactory: IMustProxifyItemHandlerFactory,
      private readonly _proxyRegistry: IProxyRegistry
   ) {
      super(true, errorLog);
   }

   protected abstract createCollectionObserver(
      data: IProxyTarget<TTarget>,
      proxifyItem: ProcessItem<TTarget, TIndex>,
      unproxifyItem: ProcessItem<TTarget, TIndex>
   ): IObserverProxyPair<TTarget, TId>;

   protected override createDisposableOwner(
      owner: IDisposableOwner,
      data: IProxyTarget<TTarget>
   ): IDisposableOwner {
      return {
         ...owner,
         release: () => {
            this._observerGroups.delete(data.target);
            owner.release();
         },
      };
   }

   protected restoreOrginalItem(
      _target: TTarget,
      _itemProxy: unknown,
      _item: unknown,
      _unproxifyItem: ProcessItem<TTarget, TIndex>
   ): void {
      return undefined;
   }

   protected override createRootObserver(
      data: IProxyTarget<TTarget>
   ): IObserverProxyPair<TTarget, TId> {
      return this.createCollectionObserver(
         data,
         data.mustProxify
            ? (item, collection, index) =>
                 this.proxifyItem(
                    item,
                    collection,
                    index,
                    data.initializeManually,
                    data.mustProxify
                 )
            : undefined,
         data.mustProxify
            ? (item, collection, index) =>
                 this.unproxifyItem(item, collection, index, data.mustProxify)
            : undefined
      );
   }

   protected override onObserverGroupCreate(
      target: TTarget,
      observerGroup: ObserverGroup
   ): void {
      this._observerGroups.set(target, observerGroup);
   }

   private proxifyItem(
      item: unknown,
      collection: TTarget,
      index: TIndex,
      initializeManually: boolean,
      mustProxify: MustProxify
   ): unknown {
      if (!mustProxify(index, collection)) {
         return item;
      }

      if (this._proxyRegistry.isProxy(item)) {
         return item;
      }

      const collectionObserverGroup = this._observerGroups.get(collection);
      Assertion.assertNotNullOrUndefined(
         collectionObserverGroup,
         `No observer group registered for given collection`
      );

      const observerProxyPair = this._objectPropertyObserverProxyPairManager
         .create(collection)
         .instance.create({
            key: index,
            value: item,
            mustProxify:
               this._mustProxifyItemHandlerFactory.create(index).instance,
            initializeManually,
            setValue: () => false,
            owner: {
               release: () => {
                  this._mustProxifyItemHandlerFactory.release(index);
                  this.restoreOrginalItem(
                     collection,
                     observerProxyPair.proxy,
                     item,
                     (item: unknown, collection: TTarget, index: TIndex) =>
                        this.unproxifyItem(item, collection, index, mustProxify)
                  );
               },
            },
         }).instance;
      if (observerProxyPair) {
         collectionObserverGroup.addObservers([observerProxyPair.observer]);
      }
      return observerProxyPair?.proxy ?? item;
   }

   private unproxifyItem = (
      item: unknown,
      collection: TTarget,
      index: TIndex,
      mustProxify: MustProxify
   ): unknown => {
      if (!mustProxify(index, collection)) {
         return item;
      }

      const arrayObserverGroup = this._observerGroups.get(collection);

      Assertion.assertNotNullOrUndefined(
         arrayObserverGroup,
         `No observer group registered for give collection`
      );
      arrayObserverGroup.removeObserver(collection, index);
      return this.releaseItem(collection, item, index);
   };

   private releaseItem(
      collection: TTarget,
      item: unknown,
      index: TIndex
   ): unknown {
      const propertyObserverManager =
         this._objectPropertyObserverProxyPairManager.getFromId(collection);

      if (!propertyObserverManager) {
         return;
      }

      let itemObserverProxyPair: IObserverProxyPair;
      const arrayItemObserverId = propertyObserverManager.getId({
         key: index,
         mustProxify: this._mustProxifyItemHandlerFactory.getFromId(index),
      });

      if (arrayItemObserverId !== null) {
         itemObserverProxyPair =
            propertyObserverManager.getFromId(arrayItemObserverId);
         itemObserverProxyPair?.observer.dispose();
      }

      return itemObserverProxyPair?.proxyTarget ?? item;
   }
}
