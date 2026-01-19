
import { ArrayProxyFactory } from '../../../lib/proxies/array-proxy/array-proxy.factory';
import { ProxyRegistry } from '../../../lib/proxies/proxy-registry/proxy-registry';

describe('ArrayProxyFactory tests', () => {
   let arrayProxyFactory: ArrayProxyFactory;
   beforeEach(() => {
      arrayProxyFactory = new ArrayProxyFactory(new ProxyRegistry());
   });

   it('Will create an instance of array proxy', () => {
      const actual = arrayProxyFactory.create({
         array: [],
      }).instance;

      expect(actual).toBeDefined();
      expect(actual.proxy).toBeDefined();
      expect(actual.observer).toBeDefined();
   });
});
