import { echo, Inject, Injectable, SingletonFactoryWithGuid } from '@rs-x/core';
import { AbstractObserver } from '../../abstract-observer';
import { IDisposableOwner } from '../../disposable-owner.interface';
import { MustProxify } from '../../object-property-observer-proxy-pair-manager.type';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokes';
import { IProxyRegistry } from '../proxy-registry/proxy-registry.interface';
import {
   IMapObserverProxyPair,
   IMapProxifyData,
   IMapProxifyIdData,
   IMapProxyFactory,
} from './map-proxy.factory.type';
import { ProcessMapItem } from './process-map-item.type';

type MapMethodKeys = 'clear' | 'set' | 'delete';

export class MapProxy extends AbstractObserver<
   Map<unknown, unknown>,
   Map<unknown, unknown>,
   undefined
> {
   private readonly proxifyItem: ProcessMapItem;
   private readonly unproxifyItem: ProcessMapItem;
   private readonly updateMap: Record<
      MapMethodKeys,
      (originalMap: Map<unknown, unknown>, ...args: unknown[]) => unknown
   >;
   private _isInitialized = false;

   constructor(
      owner: IDisposableOwner,
      initialValue: Map<unknown, unknown>,
      proxifyItem: ProcessMapItem,
      unproxifyItem: ProcessMapItem,
      private readonly _proxyRegistry: IProxyRegistry
   ) {
      super(owner, null, initialValue);

      this.updateMap = {
         clear: this.clearMap,
         set: this.setMap,
         delete: this.deleteMap,
      };

      this.proxifyItem = proxifyItem ?? echo;
      this.unproxifyItem = unproxifyItem ?? echo;
      this.target = new Proxy(initialValue, this);
      this._proxyRegistry.register(initialValue, this.target);
   }

   public override init(): void {
      if (this.proxifyItem === echo || this._isInitialized) {
         return;
      }

      this.proxifyItems(this.initialValue);
      this._isInitialized = true;
   }

   public get(
      originalMap: Map<unknown, unknown>,
      property: PropertyKey
   ): unknown {
      if (property !== 'constructor' && this.updateMap[property]) {
         return (...args: unknown[]) => {
            return this.updateMap[property](originalMap, ...args);
         };
      } else if (property === 'get') {
         return (key) => originalMap.get(key);
      } else {
         return typeof originalMap[property] === 'function'
            ? originalMap[property].bind(originalMap)
            : originalMap[property];
      }
   }

   protected override disposeInternal(): void {
      this._proxyRegistry.unregister(this.initialValue);
      this.restoreOrginalMap();
   }

   private clearMap = (originalMap: Map<unknown, unknown>) => {
      for (const key of originalMap.keys()) {
         this.deleteItem(originalMap, key);
      }
   };

   private setMap = (
      originalMap: Map<unknown, unknown>,
      ...args: unknown[]
   ) => {
      const key = args[0];
      const value = args[1];
      const oldValue = originalMap.get(key);
      if (oldValue !== undefined) {
         this.unproxifyItem(oldValue, originalMap, key);
      }
      originalMap.set(key, value);
      originalMap.set(key, this.proxifyItem(value, originalMap, key));

      this.emitSet(originalMap, key, value, oldValue === undefined);

      return this.target;
   };

   private deleteMap = (
      originalMap: Map<unknown, unknown>,
      ...args: unknown[]
   ) => {
      return this.deleteItem(originalMap, args[0]);
   };

   private restoreOrginalMap(): void {
      for (const [key, value] of this.initialValue.entries()) {
         this.initialValue.set(
            key,
            this.unproxifyItem(value, this.initialValue, key)
         );
      }
   }

   private proxifyItems(map: Map<unknown, unknown>): void {
      for (const [key, value] of map.entries()) {
         map.set(key, this.proxifyItem(value, map, key));
      }
   }

   private deleteItem(
      originalMap: Map<unknown, unknown>,
      key: unknown
   ): boolean {
      const item = originalMap.get(key);
      if (item === undefined) {
         return false;
      }

      originalMap.delete(key);

      this.emitSet(originalMap, key);

      this.unproxifyItem(item, originalMap, key);

      return true;
   }

   private emitSet(
      originalMap: Map<unknown, unknown>,
      key: unknown,
      value?: unknown,
      isNew?: boolean
   ): void {
      this.emitChange({
         arguments: [],
         chain: [{ object: originalMap, id: key }],
         id: key,
         target: originalMap,
         newValue: value,
         isNew: !!isNew,
      });
   }
}

@Injectable()
export class MapProxyFactory
   extends SingletonFactoryWithGuid<
      IMapProxifyData,
      IMapObserverProxyPair,
      IMapProxifyIdData
   >
   implements IMapProxyFactory
{
   constructor(
      @Inject(RsXStateManagerInjectionTokens.IProxyRegistry)
      private readonly _proxyRegistry: IProxyRegistry
   ) {
      super();
   }

   protected override getGroupId(
      data: IMapProxifyIdData
   ): Map<unknown, unknown> {
      return data.map;
   }

   protected override getGroupMemberId(data: IMapProxifyIdData): MustProxify {
      return data.mustProxify;
   }

   protected override createInstance(
      data: IMapProxifyData,
      id: string
   ): IMapObserverProxyPair {
      const observer = new MapProxy(
         {
            canDispose: () => this.getReferenceCount(id) === 1,
            release: () => {
               this.release(id);
               data.owner?.release();
            },
         },
         data.map,
         data.mustProxify && data.proxifyItem
            ? (item: unknown, map: Map<unknown, unknown>, key: unknown) => {
                 if (data.mustProxify(key, map)) {
                    return data.proxifyItem(item, map, key);
                 }
                 return item;
              }
            : undefined,
         data.mustProxify && data.unproxifyItem
            ? (item: unknown, map: Map<unknown, unknown>, key: unknown) => {
                 if (data.mustProxify(key, map)) {
                    return data.unproxifyItem(item, map, key);
                 }
                 return item;
              }
            : undefined,
         this._proxyRegistry
      );
      return {
         observer,
         proxy: observer.target,
         proxyTarget: data.map,
         emitChangeWhenSet: true,
         id,
      };
   }

   protected override releaseInstance(
      mapObserverWithProxy: IMapObserverProxyPair
   ): void {
      mapObserverWithProxy.observer.dispose();
   }
}
