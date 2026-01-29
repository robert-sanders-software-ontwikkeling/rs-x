import { GuidFactory } from '@rs-x/core';

import { DateProxyFactory } from '../../../lib/proxies/date-proxy/date-proxy.factory';
import { ProxyRegistry } from '../../../lib/proxies/proxy-registry/proxy-registry';


describe('DateProxyFactory tests', () => {
   let dateProxyFactory: DateProxyFactory;
   beforeEach(() => {
      dateProxyFactory = new DateProxyFactory(new GuidFactory(), new ProxyRegistry());
   });

   it('will  create an instance of date proxy', () => {
      const actual = dateProxyFactory.create({
         date: new Date(),
      }).instance;

      expect(actual).toBeDefined();
      expect(actual.proxy).toBeDefined();
      expect(actual.observer).toBeDefined();
   });
});
