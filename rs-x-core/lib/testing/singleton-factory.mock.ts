import { ISingletonFactory } from '../singleton-factory/singleton.factory.interface';

export class SingletonFactoryMock<TId, TData, TInstance>
   implements ISingletonFactory<TId, TData, TInstance>
{
   public isEmpty: boolean;
   public readonly ids = jest.fn();
   public readonly has = jest.fn();
   public readonly getId = jest.fn();
   public readonly create = jest.fn();
   public readonly release = jest.fn();
   public readonly getFromData = jest.fn();
   public readonly getFromId = jest.fn();
   public readonly getOrCreate = jest.fn();
   public readonly dispose = jest.fn();
   public readonly exists = jest.fn();
}
