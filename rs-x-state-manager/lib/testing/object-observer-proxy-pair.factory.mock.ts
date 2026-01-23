import { type IObjectObserverProxyPairFactory } from '../object-observer/object-observer-proxy-pair.factory.interface';

export class ObjectObserverProxyPairFactoryMock
   implements IObjectObserverProxyPairFactory
{
   public priority: number;
   public readonly create = jest.fn();
   public readonly applies = jest.fn();
}
