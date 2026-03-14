import { InvalidOperationException } from '../exceptions';

import {
  type IGroupedKeyedInstanceFactory,
  type IInstanceGroupInfo,
} from './grouped-keyed-instance-factory.interface';
import { KeyedInstanceFactory } from './keyed-instance.factory';

export abstract class GroupedKeyedInstanceFactory<
  TId,
  TData extends TIdData,
  TInstance,
  TIdData = TData,
>
  extends KeyedInstanceFactory<TId, TData, TInstance, TIdData>
  implements IGroupedKeyedInstanceFactory<TId, TData, TInstance, TIdData>
{
  private readonly _groupedData = new Map<unknown, Map<unknown, TId>>();
  private readonly _groupMemberById = new Map<
    TId,
    { groupId: unknown; groupMemberId: unknown }
  >();

  public *instanceGroupInfoEntries(): IterableIterator<
    IInstanceGroupInfo<TId, TInstance>
  > {
    for (const groupId of this.groupIds) {
      const group = this.getGroup(groupId);
      if (!group) {
        continue;
      }

      for (const [groupMemberId, id] of group) {
        const instance = this.getFromId(id);
        if (!instance) {
          continue;
        }

        yield { groupId, groupMemberId, id, instance };
      }
    }
  }

  public getId(data: TIdData): TId | undefined {
    const groupId = this.getGroupId(data);
    const groupMemberId = this.getGroupMemberId(data);
    return this._groupedData.get(groupId)?.get(groupMemberId);
  }

  public isGroupRegistered(groupId: unknown): boolean {
    return this._groupedData.has(groupId);
  }

  protected abstract getGroupId(data: TIdData): unknown;
  protected abstract getGroupMemberId(data: TIdData): unknown;
  protected abstract createUniqueId(data: TIdData): TId;

  protected get groupIds(): MapIterator<unknown> {
    return this._groupedData.keys();
  }

  protected getGroup<T>(groupId: unknown): Map<T, TId> | undefined {
    return this._groupedData.get(groupId) as Map<T, TId>;
  }

  protected createId(data: TData): TId {
    const groupId = this.getGroupId(data);
    let dataGroup = this._groupedData.get(groupId);

    if (!dataGroup) {
      dataGroup = new Map<unknown, TId>();
      this._groupedData.set(groupId, dataGroup);
    }

    let groupMemberId = this.getGroupMemberId(data);
    let groupMember = dataGroup.get(groupMemberId);
    if (groupMember) {
      throw new InvalidOperationException('id allready exists');
    }

    const id = this.createUniqueId(data);
    dataGroup.set(groupMemberId, id);
    this._groupMemberById.set(id, {
      groupId,
      groupMemberId,
    });
    return id;
  }

  protected override releaseInstance(_instance: TInstance, id: TId): void {
    const groupMember = this._groupMemberById.get(id);
    if (!groupMember) {
      return;
    }
    this._groupMemberById.delete(id);

    const dataGroup = this._groupedData.get(groupMember.groupId);
    if (!dataGroup) {
      return;
    }

    dataGroup.delete(groupMember.groupMemberId);
    if (dataGroup.size === 0) {
      this._groupedData.delete(groupMember.groupId);
    }
  }

  protected override onDispose(): void {
    this._groupMemberById.clear();
  }
}
