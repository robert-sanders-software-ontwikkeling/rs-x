import { ProxyRegistry } from '../../../lib/proxies/proxy-registry/proxy-registry';
import { SetProxyFactory } from '../../../lib/proxies/set-proxy/set-proxy.factory';

describe('SetProxyFactory tests', () => {
   let setProxyFactory: SetProxyFactory;
   beforeEach(() => {
      setProxyFactory = new SetProxyFactory(new ProxyRegistry());
   });

   it('will create an instance of set proxy', () => {
      const actual = setProxyFactory.create({
         set: new Set(),
         proxifyItem: jest.fn(),
         unproxifyItem: jest.fn(),
      }).instance;

      expect(actual).toBeDefined();
      expect(actual.proxy).toBeDefined();
      expect(actual.observer).toBeDefined();
   });
});
