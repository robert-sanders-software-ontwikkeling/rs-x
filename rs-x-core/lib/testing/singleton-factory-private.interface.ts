import { ISingletonFactory } from '../singleton-factory/singleton.factory.interface';

export interface ISingletonFactoryPrivate<TId, TData, TInstance>
   extends ISingletonFactory<TId, TData, TInstance> {
   _instances: Map<TId, TInstance>;
   _referenceCounts: Map<TId, number>;
}
