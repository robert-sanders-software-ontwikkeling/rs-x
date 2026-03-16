import { type IGuidFactory } from '../guid';

import { GroupedKeyedInstanceFactory } from './grouped-keyed-instance-factory';

export abstract class GuidKeyedInstanceFactory<
  TData extends TIdData,
  TInstance,
  TIdData = TData,
> extends GroupedKeyedInstanceFactory<string, TData, TInstance, TIdData> {
  protected constructor(private readonly _guidFactory: IGuidFactory) {
    super();
  }

  protected createUniqueId(_data: TData): string {
    return this._guidFactory.create();
  }
}
