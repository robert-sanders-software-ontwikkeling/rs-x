import { type IDisposable } from '../types/disposable.interface';

export interface IKeyedInstanceFactory<
  TId = unknown,
  TData = unknown,
  TInstance = unknown,
  TIdData = TData,
> extends IDisposable {
  readonly isEmpty: boolean;
  readonly size: number;
  create(data: TData): {
    referenceCount: number;
    instance: TInstance;
    id: TId;
  };
  /** Like `create(data).instance` but allocates no intermediate result object. */
  createAndGetInstance(data: TData): TInstance;
  release(
    id: TId,
    force?: boolean,
  ): { referenceCount: number; instance: TInstance | null };
  ids(): MapIterator<TId>;
  getOrCreate(data: TData): TInstance;
  getFromId(id: TId): TInstance | undefined;
  has(id: TId): boolean;
  getFromData(data: TIdData): TInstance | undefined;
  getId(data: TIdData): TId | undefined;
  getReferenceCount(id: TId): number;
  exists(instance: TInstance): boolean;
}
