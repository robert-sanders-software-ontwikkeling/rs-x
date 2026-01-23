import { type IDisposable } from '../types/disposable.interface';

export interface ISingletonFactory<
   TId = unknown,
   TData = unknown,
   TInstance = unknown,
   TIdData = TData,
> extends IDisposable {
   readonly isEmpty: boolean;
   create(data: TData): {
      referenceCount: number;
      instance: TInstance;
      id: TId;
   };
   release(
      id: TId,
      force?: boolean
   ): { referenceCount: number; instance: TInstance };
   ids(): MapIterator<TId>;
   getOrCreate(data: TData): TInstance;
   getFromId(id: TId): TInstance;
   has(id: TId): boolean;
   getFromData(data: TIdData): TInstance;
   getId(data: TIdData): TId;

   exists(instance: TInstance): boolean;
}
