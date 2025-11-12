import { IObjectObserverProxyPairFactory } from '../object-observer/object-observer-proxy-pair.factory.interface';

export class ObjectObserverProxyPairFactoryMock
   implements IObjectObserverProxyPairFactory
{
   public readonly create = jest.fn();
   public readonly applies = jest.fn();
}
