import { type IIndexObserverProxyPairFactory } from '../property-observer/index-observer-proxy-pair.factory.interface';

export class PropertyObserverProxyPairFactoryMock
   implements IIndexObserverProxyPairFactory
{
   public readonly dispose = jest.fn();
   public readonly create = jest.fn();
   public readonly applies = jest.fn();
}
