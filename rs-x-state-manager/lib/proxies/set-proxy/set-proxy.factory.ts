import { echo, Inject, Injectable, SingletonFactoryWithGuid } from '@rs-x/core';
import { AbstractObserver } from '../../abstract-observer';
import { IDisposableOwner } from '../../disposable-owner.interface';
import { MustProxify } from '../../object-property-observer-proxy-pair-manager.type';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokes';
import { IProxyRegistry } from '../proxy-registry/proxy-registry.interface';
import { ProcessSetItem } from './process-set-item.type';
import {
   ISetObserverProxyPair,
   ISetProxifyData,
   ISetProxifyIdData,
   ISetProxyFactory,
} from './set-proxy.factory.type';

type SetMethodsKeys = 'clear' | 'add' | 'delete' | 'has';

export class SetProxy extends AbstractObserver<
   Set<unknown>,
   Set<unknown>,
   undefined
> {
   private readonly _itemProxies = new Map<unknown, unknown>();
   private readonly proxifyItem: ProcessSetItem;
   private readonly unproxifyItem: ProcessSetItem;
   private _isInitialized = false;
   private readonly updateSet: Record<
      SetMethodsKeys,
      (originalSet: Set<unknown>, ...args: unknown[]) => unknown
   >;

   constructor(
      owner: IDisposableOwner,
      initialValue: Set<unknown>,
      proxifyItem: ProcessSetItem,
      unproxifyItem: ProcessSetItem,
      private readonly _proxyRegistry: IProxyRegistry
   ) {
      super(owner, undefined, initialValue);

      this.updateSet = {
         clear: this.clearSet,
         add: this.addSet,
         delete: this.deleteSet,
         has: this.hasSet,
      };

      this.proxifyItem = proxifyItem ?? echo;
      this.unproxifyItem = unproxifyItem ?? echo;
      this.target = new Proxy(initialValue, this);
      this._proxyRegistry.register( initialValue, this.target);
   }

   public override init(): void {
      if (this.proxifyItem === echo || this._isInitialized) {
         return;
      }
      this._isInitialized = true;
      this.proxifyItems(this.initialValue);
   }

   public get(originalSet: Set<unknown>, property: PropertyKey): unknown {
      if (property !== 'constructor' && this.updateSet[property]) {
         return (...args: unknown[]) => {
            const result = this.updateSet[property](originalSet, ...args);
            this.emitChange({
               arguments: args,
               chain: [],
               id: property,
               target: originalSet,
               newValue: originalSet,
            });

            return result;
         };
      } else {
         return typeof originalSet[property] === 'function'
            ? originalSet[property].bind(originalSet)
            : originalSet[property];
      }
   }

   protected override disposeInternal(): void {
      this._proxyRegistry.unregister(this.initialValue);
      this.restoreOrginalSet();
   }

   private clearSet = (originalSet: Set<unknown>) => {
      for (const value of originalSet.values()) {
         this.deleteItem(originalSet, value);
      }
   };

   private addSet = (originalSet: Set<unknown>, ...args: unknown[]) => {
      if (this._itemProxies.has(args[0])) {
         return this;
      }
      originalSet.add(this.proxifyItemInternal(args[0], originalSet));

      return this.target;
   };

   private deleteSet = (originalSet: Set<unknown>, ...args: unknown[]) => {
      return this.deleteItem(originalSet, args[0]);
   };

   private hasSet = (originalSet: Set<unknown>, ...args: unknown[]) => {
      const key = this._itemProxies.get(args[0]) ?? args[0];
      return originalSet.has(key);
   };

   private deleteItem(originalSet: Set<unknown>, item: unknown): boolean {
      const itemToDelete = this._itemProxies.get(item) ?? item;
      if (!originalSet.has(itemToDelete)) {
         return false;
      }
      this._itemProxies.delete(item);
      this.unproxifyItem(itemToDelete, originalSet, item);
      return originalSet.delete(itemToDelete);
   }

   private restoreOrginalSet(): void {
      const unproxifiedItems = [];
      for (const value of this.initialValue.values()) {
         unproxifiedItems.push(
            this.unproxifyItem(value, this.initialValue, value)
         );
      }

      this.initialValue.clear();
      unproxifiedItems.forEach((item) => this.initialValue.add(item));

      this._itemProxies.clear();
   }

   private proxifyItemInternal(item: unknown, set: Set<unknown>): unknown {
      const proxifiedItem = this.proxifyItem(item, set, item);
      this._itemProxies.set(item, proxifiedItem);
      return proxifiedItem;
   }

   private proxifyItems(set: Set<unknown>): void {
      const proxifiedItems = [];
      const values = [];

      for (const value of set.values()) {
         const proxifiedItem = this.proxifyItemInternal(value, set);
         values.push(proxifiedItem);
         if (value !== proxifiedItem) {
            proxifiedItems.push(proxifiedItem);
         }
      }
      if (proxifiedItems.length > 0) {
         set.clear();
         values.forEach((value) => set.add(value));
         proxifiedItems.forEach((item) => this.initialValue.add(item));
      }
   }
}

@Injectable()
export class SetProxyFactory
   extends SingletonFactoryWithGuid<
      ISetProxifyData,
      ISetObserverProxyPair,
      ISetProxifyIdData
   >
   implements ISetProxyFactory
{
   constructor(
      @Inject(RsXStateManagerInjectionTokens.IProxyRegistry)
      private readonly _proxyRegistry: IProxyRegistry
   ) {
      super();
   }

   protected override getGroupId(data: ISetProxifyIdData): Set<unknown> {
      return data.set;
   }

   protected override getGroupMemberId(data: ISetProxifyIdData): MustProxify {
      return data.mustProxify;
   }

   protected override createInstance(
      data: ISetProxifyData,
      id: string
   ): ISetObserverProxyPair {
      const observer = new SetProxy(
         {
            canDispose: () => this.getReferenceCount(id) === 1,
            release: () => this.release(id),
         },
         data.set,
         data.mustProxify && data.proxifyItem
            ? (item: unknown, set: Set<unknown>, key: unknown) => {
                 if (data.mustProxify(key, set)) {
                    return data.proxifyItem(item, set, key);
                 }
                 return item;
              }
            : undefined,
         data.mustProxify && data.unproxifyItem
            ? (item: unknown, set: Set<unknown>, key: unknown) => {
                 if (data.mustProxify(key, set)) {
                    return data.unproxifyItem(item, set, key);
                 }
                 return item;
              }
            : undefined,
         this._proxyRegistry
      );
      return {
         observer,
         proxy: observer.target,
         emitChangeWhenSet: true,
         proxyTarget: data.set,
         id,
      };
   }

   protected override releaseInstance(
      setObserverWithProxy: ISetObserverProxyPair
   ): void {
      setObserverWithProxy.observer.dispose();
   }
}
