import { InvalidOperationException } from '../exceptions';
import { type IGuidFactory } from '../guid';

import { SingletonFactory } from './singleton.factory';
import {
  type IInstanceGroupInfo,
  type ISingletonFactoryWithIdGeneration,
} from './singleton-factory-with-id-generation.interface';

export abstract class SingletonFactoryWithIdGeneration<
  TId,
  TData extends TIdData,
  TInstance,
  TIdData = TData,
>
  extends SingletonFactory<TId, TData, TInstance, TIdData>
  implements ISingletonFactoryWithIdGeneration<TId, TData, TInstance, TIdData>
{
  private readonly _groupedData = new Map<unknown, Map<unknown, TId>>();

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
    return id;
  }

  protected override releaseInstance(_instance: TInstance, id: TId): void {
    const { groupId, groupMemberId } = this.findGroupMemberId(id);
    let dataGroup = this._groupedData.get(groupId);

    if (!dataGroup) {
      return;
    }

    dataGroup.delete(groupMemberId);
    if (dataGroup.size === 0) {
      this._groupedData.delete(groupId);
    }
  }

  private findGroupMemberId(idToFind: unknown): {
    groupId: unknown;
    groupMemberId: unknown;
  } {
    for (const [groupId, groupData] of this._groupedData) {
      for (const [groupMemberId, id] of groupData.entries()) {
        if (idToFind === id) {
          return {
            groupId,
            groupMemberId,
          };
        }
      }
    }

    return {
      groupId: null,
      groupMemberId: null,
    };
  }
}

export abstract class SingletonFactoryWithGuid<
  TData extends TIdData,
  TInstance,
  TIdData = TData,
> extends SingletonFactoryWithIdGeneration<string, TData, TInstance, TIdData> {
  protected constructor(private readonly _guidFactory: IGuidFactory) {
    super();
  }
  protected createUniqueId(_data: TData): string {
    return this._guidFactory.create();
  }
}
