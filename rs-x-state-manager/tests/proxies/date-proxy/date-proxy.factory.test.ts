import { DateProxyFactory, ProxyRegistry } from '@rs-x/state-manager';

describe('DateProxyFactory tests', () => {
   let dateProxyFactory: DateProxyFactory;
   beforeEach(() => {
      dateProxyFactory = new DateProxyFactory(new ProxyRegistry());
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
