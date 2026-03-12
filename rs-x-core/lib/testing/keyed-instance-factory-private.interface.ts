import { type IKeyedInstanceFactory } from '../keyed-instance-factory/keyed-instance.factory.interface';

export interface IKeyedInstanceFactoryPrivate<
  TId,
  TData,
  TInstance,
> extends IKeyedInstanceFactory<TId, TData, TInstance> {
  _instances: Map<TId, TInstance>;
  _referenceCounts: Map<TId, number>;
}
