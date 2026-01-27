import { type IDisposableOwner, Inject, Injectable, SingletonFactory, Type } from '@rs-x/core';
import { AbstractObserver } from '../../abstract-observer';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokes';
import type { IProxyRegistry } from '../proxy-registry/proxy-registry.interface';
import type {
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
   private readonly updateSet: Record<
      SetMethodsKeys,
      (originalSet: Set<unknown>, ...args: unknown[]) => unknown
   >;

   constructor(
      owner: IDisposableOwner,
      initialValue: Set<unknown>,
      private readonly _proxyRegistry: IProxyRegistry
   ) {
      super(owner, Type.cast(undefined), initialValue);

      this.updateSet = {
         clear: this.clearSet,
         add: this.addSet,
         delete: this.deleteSet,
         has: this.hasSet,
      };


      this.target = new Proxy(initialValue, this);
      this._proxyRegistry.register(initialValue, this.target);
   }

   public get(originalSet: Set<unknown>, property: PropertyKey): unknown {
      const target = originalSet as unknown as Record<PropertyKey, unknown>;

      if (property !== 'constructor' && property in this.updateSet) {
         return (...args: unknown[]) =>
            (this.updateSet as Record<PropertyKey, Function>)[property](
               originalSet,
               ...args
            );
      }

      const value = target[property];

      return typeof value === 'function'
         ? (value as Function).bind(originalSet)
         : value;
   }

   protected override disposeInternal(): void {
      this._proxyRegistry.unregister(this.value);
   }

   private clearSet = (originalSet: Set<unknown>) => {
      for (const value of originalSet.values()) {
         this.deleteSet(originalSet, value);
      }
   };

   private addSet = (originalSet: Set<unknown>, ...args: unknown[]) => {
      originalSet.add(args[0]);
      this.emitValueChange(originalSet, args[0], args[0])
      return this.target;
   };

   private deleteSet = (originalSet: Set<unknown>, ...args: unknown[]) => {
      const result = originalSet.delete(args[0])
      this.emitValueChange(originalSet, args[0], undefined)
      return result;
   };

   private hasSet = (originalSet: Set<unknown>, ...args: unknown[]) => {
      return originalSet.has(args[0]);
   };

   private emitValueChange(originalSet: Set<unknown>, id: unknown, value: unknown): void {
      this.emitChange({
         arguments: [],
         chain: [{ object: originalSet, id, }],
         id,
         target: originalSet,
         newValue: value,
      });
   }
}

@Injectable()
export class SetProxyFactory
   extends SingletonFactory<
      Set<unknown>,
      ISetProxifyData,
      ISetObserverProxyPair,
      ISetProxifyIdData
   >
   implements ISetProxyFactory {

   constructor(
      @Inject(RsXStateManagerInjectionTokens.IProxyRegistry)
      private readonly _proxyRegistry: IProxyRegistry
   ) {
      super();
   }

   public override getId(data: ISetProxifyIdData): Set<unknown> {
      return data.set;
   }

   protected override createId(data: ISetProxifyIdData): Set<unknown> {
      return data.set;
   }


   protected override createInstance(
      data: ISetProxifyData,
      id: Set<unknown>
   ): ISetObserverProxyPair {
      const observer = new SetProxy(
         {
            canDispose: () => this.getReferenceCount(id) === 1,
            release: () => {
               this.release(id);
               data.owner?.release();
            },
         },
         data.set,
         this._proxyRegistry
      );
      return {
         observer,
         proxy: observer.target,
         proxyTarget: data.set,
      };
   }

   protected override releaseInstance(
      setObserverWithProxy: ISetObserverProxyPair
   ): void {
      setObserverWithProxy.observer.dispose();
   }
}
