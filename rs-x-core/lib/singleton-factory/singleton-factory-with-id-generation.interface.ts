import { type ISingletonFactory } from './singleton.factory.interface';

export interface ISingletonFactoryWithIdGeneration<
  TId,
  TData extends TIdData,
  TInstance,
  TIdData = TData,
> extends ISingletonFactory<TId, TData, TInstance, TIdData> {
  isGroupRegistered(groupId: unknown): boolean;
}
