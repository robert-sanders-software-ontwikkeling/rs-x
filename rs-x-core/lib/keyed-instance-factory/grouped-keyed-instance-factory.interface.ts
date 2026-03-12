import { type IKeyedInstanceFactory } from './keyed-instance.factory.interface';

export type IInstanceGroupInfo<TId, TInstance> = {
  groupId: unknown;
  groupMemberId: unknown;
  id: TId;
  instance: TInstance;
};
export interface IGroupedKeyedInstanceFactory<
  TId,
  TData extends TIdData,
  TInstance,
  TIdData = TData,
> extends IKeyedInstanceFactory<TId, TData, TInstance, TIdData> {
  isGroupRegistered(groupId: unknown): boolean;
  instanceGroupInfoEntries(): IterableIterator<
    IInstanceGroupInfo<TId, TInstance>
  >;
}
