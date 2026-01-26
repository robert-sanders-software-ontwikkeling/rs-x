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
   ): { referenceCount: number; instance: TInstance | null };
   ids(): MapIterator<TId>;
   getOrCreate(data: TData): TInstance;
   getFromId(id: TId): TInstance | undefined;
   has(id: TId): boolean;
   getFromData(data: TIdData): TInstance | undefined;
   getId(data: TIdData): TId | undefined;

   exists(instance: TInstance): boolean;
}
