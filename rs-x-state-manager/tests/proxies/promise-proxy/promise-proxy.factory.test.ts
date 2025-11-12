import { ObservableAccessor } from '@rs-x-core';
import { Observable } from 'rxjs';
import { ObservableProxyFactory } from '../../../lib/proxies/observable-proxy/observable-proxy.factory';

describe('ObservableProxyFactory tests', () => {
   let observableProxyFactory: ObservableProxyFactory;
   beforeEach(() => {
      observableProxyFactory = new ObservableProxyFactory(
         new ObservableAccessor()
      );
   });

   it('will  create an instance of obserable proxy', () => {
      const actual = observableProxyFactory.create({
         observable: new Observable<number>(),
      }).instance;

      expect(actual).toBeDefined();
      expect(actual.proxy).toBeUndefined();
      expect(actual.observer).toBeDefined();
   });
});
