import { InjectionContainer, IPropertyChange, WaitForEvent } from '@rs-x/core';
import { DisposableOwnerMock } from '@rs-x/core/testing';
import { IObjectObserverProxyPairFactory } from '../../../lib/object-observer/object-observer-proxy-pair.factory.interface';
import { IObserver } from '../../../lib/observer.interface';
import { RsXStateManagerInjectionTokens } from '../../../lib/rs-x-state-manager-injection-tokes';
import { RsXStateManagerModule } from '../../../lib/rs-x-state-manager.module';

describe('PromiseObserverProxyPairFactory tests', () => {
   let disposableOwner: DisposableOwnerMock;
   let observer: IObserver;
   let promiseObserverFactory: IObjectObserverProxyPairFactory;

   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);
      promiseObserverFactory =
         InjectionContainer.get<IObjectObserverProxyPairFactory>(
            RsXStateManagerInjectionTokens.PromiseObserverProxyPairFactory
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

   it('create will return no proxy', async () => {
      const promise = Promise.resolve(100);
      const observerProxyPair = promiseObserverFactory.create(disposableOwner, {
         target: promise,
      });
      observer = observerProxyPair.observer;
      expect(observerProxyPair.proxy).toBeUndefined();
   });

   it('emits change event when observer emits value', async () => {
      let resolveHandler: (value: number) => void;
      const promise = new Promise((resolve) => {
         resolveHandler = resolve;
      });
      const observer = promiseObserverFactory.create(disposableOwner, {
         target: promise,
      }).observer;

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         resolveHandler(200);
      });

      const expected: IPropertyChange = {
         arguments: [],
         chain: [],
         newValue: 200,
         target: promise,
      };

      expect(actual).toEqual(expected);
   });
});
