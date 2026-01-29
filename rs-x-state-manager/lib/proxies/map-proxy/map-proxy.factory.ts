import { type IDisposableOwner, Inject, Injectable, SingletonFactory, Type } from '@rs-x/core';

import { AbstractObserver } from '../../abstract-observer';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokes';
import type { IProxyRegistry } from '../proxy-registry/proxy-registry.interface';

import type {
   IMapObserverProxyPair,
   IMapProxifyData,
   IMapProxyFactory
} from './map-proxy.factory.type';

type MapMethodKeys = 'clear' | 'set' | 'delete';

export class MapProxy extends AbstractObserver<
   Map<unknown, unknown>,
   Map<unknown, unknown>,
   undefined
> {
   private readonly updateMap: Record<
      MapMethodKeys,
      (originalMap: Map<unknown, unknown>, ...args: unknown[]) => unknown
   >;

   constructor(
      owner: IDisposableOwner,
      map: Map<unknown, unknown>,
      private readonly _proxyRegistry: IProxyRegistry
   ) {
      super(owner, Type.cast(undefined), map);

      this.updateMap = {
         clear: this.clearMap,
         set: this.setMap,
         delete: this.deleteMap,
      };

      this.target = new Proxy(map, this);
      this._proxyRegistry.register(map, this.target);
   }



   public get(
      originalMap: Map<unknown, unknown>,
      property: PropertyKey
   ): unknown {
      if (this.isUpdateMapKey(property)) {
         return (...args: unknown[]) => {
            return this.updateMap[property](originalMap, ...args);
         };
      }

      if (property === 'get') {
         return (key: unknown) => originalMap.get(key);
      }

      const mapAny = originalMap as unknown as Record<PropertyKey, unknown>;

      return typeof mapAny[property] === 'function'
         ? (mapAny[property] as Function).bind(originalMap)
         : mapAny[property];
   }

   protected override disposeInternal(): void {
      this._proxyRegistry.unregister(this.value);;
   }

   private isUpdateMapKey(
      property: PropertyKey
   ): property is keyof typeof this.updateMap {
      return typeof property === 'string' && property in this.updateMap;
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
      originalMap.set(key, value);
      this.emitSet(originalMap, key, value);

      return this.target;
   };

   private deleteMap = (
      originalMap: Map<unknown, unknown>,
      ...args: unknown[]
   ) => {
      return this.deleteItem(originalMap, args[0]);
   };

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

      return true;
   }

   private emitSet(
      originalMap: Map<unknown, unknown>,
      key: unknown,
      value?: unknown,
   ): void {
      this.emitChange({
         arguments: [],
         chain: [{ object: originalMap, id: key }],
         id: key,
         target: originalMap,
         newValue: value,
      });
   }
}

@Injectable()
export class MapProxyFactory
   extends SingletonFactory<
      Map<unknown, unknown>,
      IMapProxifyData,
      IMapObserverProxyPair
   >
   implements IMapProxyFactory {

   constructor(
      @Inject(RsXStateManagerInjectionTokens.IProxyRegistry)
      private readonly _proxyRegistry: IProxyRegistry
   ) {
      super();
   }

   public override getId(data: IMapProxifyData): Map<unknown, unknown> {
      return data.map
   }

   protected override createId(data: IMapProxifyData): Map<unknown, unknown> {
      return data.map
   }

   protected override createInstance(
      data: IMapProxifyData,
      id: Map<unknown, unknown>
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
         this._proxyRegistry
      );
      return {
         observer,
         proxy: observer.target,
         proxyTarget: data.map,
      };
   }

   protected override releaseInstance(
      mapObserverWithProxy: IMapObserverProxyPair
   ): void {
      mapObserverWithProxy.observer.dispose();
   }
}
