import { MapProxyFactory } from '../../../lib/proxies/map-proxy/map-proxy.factory';
import { ProxyRegistryMock } from '../../../lib/testing/proxies/proxy-registry.mock';

describe('MapProxyFactory tests', () => {
   let mapProxyFactory: MapProxyFactory;
   beforeEach(() => {
      mapProxyFactory = new MapProxyFactory(new ProxyRegistryMock());
   });

   it('will  create an instance of map proxy', () => {
      const actual = mapProxyFactory.create({
         map: new Map(),
         proxifyItem: jest.fn(),
         unproxifyItem: jest.fn(),
      }).instance;

      expect(actual).toBeDefined();
      expect(actual.proxy).toBeDefined();
      expect(actual.observer).toBeDefined();
   });
});
