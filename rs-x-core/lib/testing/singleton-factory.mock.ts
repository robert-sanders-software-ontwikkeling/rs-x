import { type ISingletonFactory } from '../singleton-factory/singleton.factory.interface';

export class SingletonFactoryMock<
  TId,
  TData,
  TInstance,
  TIdData = TData,
> implements ISingletonFactory<TId, TData, TInstance, TIdData> {
  public isEmpty: boolean = false;
  public readonly ids = jest.fn();
  public readonly has = jest.fn();
  public readonly getId = jest.fn();
  public readonly create = jest.fn();
  public readonly release = jest.fn();
  public readonly getFromData = jest.fn();
  public readonly getFromId = jest.fn();
  public readonly getOrCreate = jest.fn();
  public readonly getReferenceCount = jest.fn();
  public readonly dispose = jest.fn();
  public readonly exists = jest.fn();
}
