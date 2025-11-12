import { ProxyRegistry } from '@rs-x-state-manager';
import { ArrayProxyFactory } from '../../../lib/proxies/array-proxy/array-proxy.factory';

describe('ArrayProxyFactory tests', () => {
   let arrayProxyFactory: ArrayProxyFactory;
   beforeEach(() => {
      arrayProxyFactory = new ArrayProxyFactory(new ProxyRegistry());
   });

   it('will  create an instance of array proxy', () => {
      const actual = arrayProxyFactory.create({
         array: [],
         proxifyItem: jest.fn(),
         unproxifyItem: jest.fn(),
      }).instance;

      expect(actual).toBeDefined();
      expect(actual.proxy).toBeDefined();
      expect(actual.observer).toBeDefined();
   });
});
