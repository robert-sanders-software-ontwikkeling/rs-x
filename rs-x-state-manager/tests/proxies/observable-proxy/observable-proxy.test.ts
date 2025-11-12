import { IPropertyChange, ObservableAccessor, WaitForEvent } from '@rs-x-core';
import { Observable, Subject } from 'rxjs';
import { ObservableProxyFactory } from '../../../lib/proxies/observable-proxy/observable-proxy.factory';
import { ObservableMock, SubscriptionMock } from '@rs-x-core/testing';

describe('ObserableProxy tests', () => {
   it('passed in observable is used as id', () => {
      const observableProxyFactory = new ObservableProxyFactory(
         new ObservableAccessor()
      );
      const observable = new Observable<number>();

      const { id } = observableProxyFactory.create({
         observable,
      }).instance;

      expect(id).toBe(observable);
   });

   it('dispose will unregister proxy when all references are released', () => {
      const observableProxyFactory = new ObservableProxyFactory(
         new ObservableAccessor()
      );
      const observable = new Observable<number>();

      const { observer: observer1, id: id1 } = observableProxyFactory.create({
         observable,
      }).instance;
      const { observer: observer2, id: id2 } = observableProxyFactory.create({
         observable,
      }).instance;

      expect(observer1).toBe(observer2);
      expect(id1).toBe(id2);
      expect(observableProxyFactory.getFromId(id1)).toBeDefined();

      observer1.dispose();

      expect(observableProxyFactory.getFromId(id2)).toBeDefined();

      observer2.dispose();

      expect(observableProxyFactory.getFromId(id2)).toBeUndefined();
   });

   it('no changed event will be emitted if we do not call init', async () => {
      const observableProxyFactory = new ObservableProxyFactory(
         new ObservableAccessor()
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
         new ObservableAccessor()
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
         new ObservableAccessor()
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
         new ObservableAccessor()
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
