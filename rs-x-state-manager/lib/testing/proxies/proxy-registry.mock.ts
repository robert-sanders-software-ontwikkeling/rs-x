import { type IProxyRegistry } from '../../proxies/proxy-registry/proxy-registry.interface';

export class ProxyRegistryMock implements IProxyRegistry {
  public readonly getProxyTarget = jest.fn();
  public readonly getProxy = jest.fn();
  public readonly register = jest.fn();
  public readonly unregister = jest.fn();
  public readonly isProxy = jest.fn();
}
