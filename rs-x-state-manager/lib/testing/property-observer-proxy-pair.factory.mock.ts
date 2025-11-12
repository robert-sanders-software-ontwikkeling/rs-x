import { IPropertyObserverProxyPairFactory } from '../property-observer/property-observer-proxy-pair.factory.interface';

export class PropertyObserverProxyPairFactoryMock
   implements IPropertyObserverProxyPairFactory
{
   public readonly dispose = jest.fn();
   public readonly create = jest.fn();
   public readonly applies = jest.fn();
}
