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
  private _lastGroupId: unknown;
  private _lastDataGroup: Map<unknown, TId> | undefined;

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

  protected replaceGroupId(oldGroupId: unknown, newGroupId: unknown): void {
    const groupMembers = this._groupedData.get(oldGroupId);
    if (!groupMembers) {
      return;
    }

    this._groupedData.delete(oldGroupId);

    this._groupedData.set(newGroupId, groupMembers);
    if (Object.is(this._lastGroupId, oldGroupId)) {
      this._lastGroupId = newGroupId;
      this._lastDataGroup = groupMembers;
    }
  }

  protected get groupIds(): MapIterator<unknown> {
    return this._groupedData.keys();
  }

  protected getGroup<T>(groupId: unknown): Map<T, TId> | undefined {
    return this._groupedData.get(groupId) as Map<T, TId>;
  }

  protected override getOrCreateId(data: TIdData): TId {
    const groupId = this.getGroupId(data);
    const dataGroup = this.getOrCreateDataGroup(groupId);

    const groupMemberId = this.getGroupMemberId(data);
    const existingId = dataGroup.get(groupMemberId);
    if (existingId !== undefined) {
      return existingId;
    }

    const id = this.createUniqueId(data);
    dataGroup.set(groupMemberId, id);
    this._groupMemberById.set(id, {
      groupId,
      groupMemberId,
    });
    return id;
  }

  protected createId(data: TData): TId {
    const groupId = this.getGroupId(data);
    const dataGroup = this.getOrCreateDataGroup(groupId);

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
      if (Object.is(this._lastGroupId, groupMember.groupId)) {
        this._lastGroupId = undefined;
        this._lastDataGroup = undefined;
      }
    }
  }

  protected override onDispose(): void {
    this._groupMemberById.clear();
    this._lastGroupId = undefined;
    this._lastDataGroup = undefined;
  }

  private getOrCreateDataGroup(groupId: unknown): Map<unknown, TId> {
    if (
      this._lastDataGroup &&
      Object.is(this._lastGroupId, groupId) &&
      this._groupedData.get(groupId) === this._lastDataGroup
    ) {
      return this._lastDataGroup;
    }

    let dataGroup = this._groupedData.get(groupId);
    if (!dataGroup) {
      dataGroup = new Map<unknown, TId>();
      this._groupedData.set(groupId, dataGroup);
    }

    this._lastGroupId = groupId;
    this._lastDataGroup = dataGroup;
    return dataGroup;
  }
}
