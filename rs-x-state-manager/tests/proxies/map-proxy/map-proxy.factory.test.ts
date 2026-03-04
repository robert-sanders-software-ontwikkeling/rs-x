import { ProxyRegistryMock } from '@rs-x/core/testing';

import { MapProxyFactory } from '../../../lib/proxies/map-proxy/map-proxy.factory';

describe('MapProxyFactory tests', () => {
  let mapProxyFactory: MapProxyFactory;
  beforeEach(() => {
    mapProxyFactory = new MapProxyFactory(new ProxyRegistryMock());
  });

  it('will  create an instance of map proxy', () => {
    const actual = mapProxyFactory.create({
      map: new Map(),
    }).instance;

    expect(actual).toBeDefined();
    expect(actual.proxy).toBeDefined();
    expect(actual.observer).toBeDefined();
  });
});
