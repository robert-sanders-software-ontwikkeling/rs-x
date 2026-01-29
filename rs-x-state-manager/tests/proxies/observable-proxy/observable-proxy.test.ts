import { Observable, Subject } from 'rxjs';

import { type IPropertyChange, ObservableAccessor, WaitForEvent } from '@rs-x/core';
import { ObservableMock, ResolvedValueCacheMock, SubscriptionMock } from '@rs-x/core/testing';

import { ObservableProxyFactory } from '../../../lib/proxies/observable-proxy/observable-proxy.factory';

describe('ObserableProxy tests', () => {
   it('dispose will unregister proxy when all references are released', () => {
      const observableProxyFactory = new ObservableProxyFactory(
         new ObservableAccessor(new ResolvedValueCacheMock())
      );
      const observable = new Observable<number>();

      const { observer: observer1 } = observableProxyFactory.create({
         observable,
      }).instance;
      const { observer: observer2} = observableProxyFactory.create({
         observable,
      }).instance;

      expect(observer1).toBe(observer2);
   
      expect(observableProxyFactory.getFromId(observable)).toBeDefined();

      observer1.dispose();

      expect(observableProxyFactory.getFromId(observable)).toBeDefined();

      observer2.dispose();

      expect(observableProxyFactory.getFromId(observable)).toBeUndefined();
   });

   it('no changed event will be emitted if we do not call init', async () => {
      const observableProxyFactory = new ObservableProxyFactory(
         new ObservableAccessor(new ResolvedValueCacheMock())
      );
      const observable = new Subject<number>();

      const { observer } = observableProxyFactory.create({
         observable,
      }).instance;

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         observable.next(10);
      });

      expect(actual).toBeNull();
   });

   it('init is idempotent', async () => {
      const observableProxyFactory = new ObservableProxyFactory(
         new ObservableAccessor(new ResolvedValueCacheMock())
      );
      const observable = new ObservableMock<number>();

      const { observer } = observableProxyFactory.create({
         observable,
      }).instance;

      expect(observable.subscribe).not.toHaveBeenCalled();

      observer.init();

      expect(observable.subscribe).toHaveBeenCalledTimes(1);
      observable.subscribe.mockClear();

      observer.init();

      expect(observable.subscribe).not.toHaveBeenCalled();
   });

   it('calling next on observable will emit change event f changed', async () => {
      const observableProxyFactory = new ObservableProxyFactory(
         new ObservableAccessor(new ResolvedValueCacheMock())
      );
      const observable = new Subject<number>();

      const { observer } = observableProxyFactory.create({
         observable,
      }).instance;
      observer.init();

      const actual = await new WaitForEvent(observer, 'changed', {
         count: 2,
      }).wait(() => {
         observable.next(10);
         observable.next(20);
         observable.next(10);
      });

      const expected: IPropertyChange[] = [
         {
            arguments: [],
            chain: [],
            newValue: 10,
            target: observable,
         },
         {
            arguments: [],
            chain: [],
            newValue: 20,
            target: observable,
         },
      ];

      expect(actual).toEqual(expected);
   });

   it('dipose will uunscribe to observerable', () => {
      const observableProxyFactory = new ObservableProxyFactory(
         new ObservableAccessor(new ResolvedValueCacheMock())
      );
      const observable = new ObservableMock<number>();
      const subscription = new SubscriptionMock();
      observable.subscribe.mockReturnValue(subscription);
      const { observer } = observableProxyFactory.create({
         observable,
      }).instance;
      observer.init();

      expect(subscription.unsubscribe).not.toHaveBeenCalled();

      observer.dispose();

      expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
   });
});
