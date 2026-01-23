import { InjectionContainer, type IPropertyChange, WaitForEvent } from '@rs-x/core';
import { DisposableOwnerMock, ObservableMock, SubscriptionMock } from '@rs-x/core/testing';
import { Subject } from 'rxjs';
import { type IObjectObserverProxyPairFactory } from '../../../lib/object-observer/object-observer-proxy-pair.factory.interface';
import { type IObserver } from '../../../lib/observer.interface';
import { RsXStateManagerInjectionTokens } from '../../../lib/rs-x-state-manager-injection-tokes';
import { RsXStateManagerModule } from '../../../lib/rs-x-state-manager.module';

describe('ObservableObserverProxyPairFactory tests', () => {
   let disposableOwner: DisposableOwnerMock;
   let observableObserverFactory: IObjectObserverProxyPairFactory;
   let observer: IObserver;

   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);
      observableObserverFactory =
         InjectionContainer.get<IObjectObserverProxyPairFactory>(
            RsXStateManagerInjectionTokens.ObservableObserverProxyPairFactory
         );
   });

   afterAll(async () => {
      await InjectionContainer.unload(RsXStateManagerModule);
   });

   beforeEach(() => {
      disposableOwner = new DisposableOwnerMock();
   });

   afterEach(() => {
      if (observer) {
         observer.dispose();
         observer = null;
      }
   });

   it('create will return undefined as proxy', async () => {
      const observable = new Subject<number>();
      const observerProxyPair = observableObserverFactory.create(
         disposableOwner,
         { target: observable }
      );
      observer = observerProxyPair.observer;

      expect(observerProxyPair.proxy).toBeUndefined();
   });

   it('emits change event when observable emits value', async () => {
      const observable = new Subject<number>();
      observer = observableObserverFactory.create(disposableOwner, {
         target: observable,
      }).observer;
      observer.init();

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         observable.next(200);
      });

      const expected: IPropertyChange = {
         arguments: [],
         chain: [],
         newValue: 200,
         target: observable,
      };

      expect(actual).toEqual(expected);
   });

   it('previous value will be stored', async () => {
      const observable = new Subject<number>();
      observer = observableObserverFactory.create(disposableOwner, {
         target: observable,
      }).observer;
      observer.init();

      await new WaitForEvent(observer, 'changed').wait(() => {
         observable.next(100);
      });

      const actual = await new WaitForEvent(observer, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         observable.next(200);
      });

      const expected: IPropertyChange = {
         arguments: [],
         chain: [],
         newValue: 200,
         target: observable,
      };

      expect(actual).toEqual(expected);
   });

   it('will not emit changes if init is not called', async () => {
      const observable = new Subject<number>();
      const observer = observableObserverFactory.create(disposableOwner, {
         target: observable,
      }).observer;

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         observable.next(200);
      });

      expect(actual).toBeNull();
   });

   it('dispose will unsubscribe to the observable', async () => {
      const observable = new ObservableMock();
      const subsription = new SubscriptionMock();
      observable.subscribe.mockReturnValue(subsription);
      observer = observableObserverFactory.create(disposableOwner, {
         target: observable,
      }).observer;
      observer.init();

      observer.dispose();

      expect(subsription.unsubscribe).toHaveBeenCalledTimes(1);
   });
});
