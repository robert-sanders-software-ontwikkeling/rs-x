import { PreDestroy } from '../dependency-injection';
import { ISingletonFactory } from './singleton.factory.interface';

export abstract class SingletonFactory<
   TId,
   TData extends TIdData,
   TInstance,
   TIdData = TData,
> implements ISingletonFactory<TId, TData, TInstance, TIdData>
{
   private readonly _instances = new Map<TId, TInstance>();
   private readonly _referenceCounts = new Map<TId, number>();

   protected constructor() {}

   public exists(target: TInstance): boolean {
      for (const instance of this._instances.values()) {
         if (target === instance) {
            return true;
         }
      }

      return false;
   }

   public get isEmpty(): boolean {
      return this._instances.size === 0;
   }

   public ids(): MapIterator<TId> {
      return this._instances.keys();
   }

   public getFromId(id: TId): TInstance {
      return this._instances.get(id);
   }

   public has(id: TId): boolean {
      return this._instances.has(id);
   }

   public getFromData(data: TIdData): TInstance {
      const id = this.getId(data);
      return id !== undefined ? this.getFromId(id) : undefined;
   }

   public abstract getId(data: TIdData): TId;

   @PreDestroy()
   public dispose(): void {
      for (const id of this._instances.keys()) {
         this.release(id, true);
      }

      this._instances.clear();
      this._referenceCounts.clear();

      this.onDipose();
   }

   public getOrCreate(data: TData): TInstance {
      let instance = this.getFromId(this.getOrCreateId(data));
      if (instance === undefined) {
         instance = this.create(data).instance;
      }
      return instance;
   }

   public create(data: TData): {
      referenceCount: number;
      instance: TInstance;
      id: TId;
   } {
      const id = this.getOrCreateId(data);
      const instance = this.getOrCreateInstance(id, data);
      const result = {
         id,
         instance,
         referenceCount: this.updateReferenceCount(id, 1, instance),
      };

      if (result.referenceCount === 1) {
         this.onInstanceCreated(result.instance, data);
      }

      return result;
   }

   public release(
      id: TId,
      force?: boolean
   ): { referenceCount: number; instance: TInstance } {
      const instance = this._instances.get(id);
      if (!instance) {
         return {
            instance: null,
            referenceCount: 0,
         };
      }

      return {
         referenceCount: this.updateReferenceCount(id, -1, instance, force),
         instance,
      };
   }

   protected get keys(): TId[] {
      return Array.from(this._instances.keys());
   }

   protected onDisposeInstance = (id: TId, dispose: () => void): boolean => {
      const { referenceCount } = this.release(id);
      if (referenceCount === 0) {
         dispose();
      }

      return referenceCount === 0;
   };

   protected abstract createInstance(data: TData, id: TId): TInstance;
   protected abstract createId(data: TIdData): TId;
   protected onDipose(): void {}
   protected onReleased(): void {}
   protected releaseInstance(_instance: TInstance, _id: TId): void {}
   protected onInstanceCreated(_instance: TInstance, _data: TData): void {}

   protected getOrCreateId(data: TIdData): TId {
      return this.getId(data) ?? this.createId(data);
   }

   protected getReferenceCount(id: TId): number {
      return this._referenceCounts.get(id) ?? 0;
   }

   protected updateReferenceCount(
      id: TId,

      change: 1 | -1,
      instance: TInstance,
      forceRelease?: boolean
   ): number {
      const referenceCount = this.getReferenceCount(id) + change;

      if (change === -1 && (forceRelease || referenceCount === 0)) {
         this._instances.delete(id);
         this._referenceCounts.delete(id);
         this.releaseInstance(instance, id);
         this.onReleased();
      } else if (referenceCount > 0) {
         this._referenceCounts.set(id, referenceCount);
      }

      return referenceCount;
   }

   private getOrCreateInstance(id: TId, data: TData): TInstance {
      let instance = this._instances.get(id);
      if (instance !== undefined) {
         return instance;
      }

      instance = this.createInstance(data, id);
      this._instances.set(id, instance);

      return instance;
   }
}
