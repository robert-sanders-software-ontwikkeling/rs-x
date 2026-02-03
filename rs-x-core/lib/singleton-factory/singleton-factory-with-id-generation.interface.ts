import { type ISingletonFactory } from './singleton.factory.interface';

export type IInstanceGroupInfo<TId, TInstance> = {
  groupId: unknown;
  groupMemberId: unknown;
  id: TId;
  instance: TInstance;
};
export interface ISingletonFactoryWithIdGeneration<
  TId,
  TData extends TIdData,
  TInstance,
  TIdData = TData,
> extends ISingletonFactory<TId, TData, TInstance, TIdData> {
  isGroupRegistered(groupId: unknown): boolean;
  instanceGroupInfoEntries(): IterableIterator<
    IInstanceGroupInfo<TId, TInstance>
  >;
}
