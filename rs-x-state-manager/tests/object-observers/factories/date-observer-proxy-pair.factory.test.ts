import {
   InjectionContainer
} from '@rs-x/core';
import { IDateObserverProxyPairFactory } from '../../../lib/object-observer/factories/date-observer-proxy-pair.factory.type';
import { IObserver } from '../../../lib/observer.interface';
import { IDateProxyFactory } from '../../../lib/proxies/date-proxy/date-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../../lib/rs-x-state-manager-injection-tokes';
import { RsXStateManagerModule } from '../../../lib/rs-x-state-manager.module';
import { DisposableOwnerMock } from '../../../lib/testing/disposable-owner.mock';

describe('DateObserverProxyPairFactory tests', () => {
   let dateObserverProxyPairFactory: IDateObserverProxyPairFactory;
   let dateProxyFactory: IDateProxyFactory;
   let disposableOwner: DisposableOwnerMock;
   let observer: IObserver;

   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);
      dateProxyFactory = InjectionContainer.get<IDateProxyFactory>(
         RsXStateManagerInjectionTokens.IDateProxyFactory
      );
      dateObserverProxyPairFactory =
         InjectionContainer.get<IDateObserverProxyPairFactory>(
            RsXStateManagerInjectionTokens.IDateObserverProxyPairFactory
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

   it('applies will return true when passed in value is Data', async () => {
      const actual = dateObserverProxyPairFactory.applies(new Date());
      expect(actual).toEqual(true);
   });

   it('applies will return false when passed in value is not Date', async () => {
      const actual = dateObserverProxyPairFactory.applies({});
      expect(actual).toEqual(false);
   });

   it('create will create a date proxy', async () => {
      const date = new Date();
      const observerProxyPair = dateObserverProxyPairFactory.create(
         disposableOwner,
         {
            target: date,
         }
      );

      const expected = dateProxyFactory.getFromData({ date })?.proxy;
      observer = observerProxyPair.observer;
      expect(expected).toBeDefined();
      expect(observerProxyPair.proxy).toBe(expected);
   });

   it('dispose will release the Date proxy', async () => {
      const date = new Date();

      const observerProxyPair = dateObserverProxyPairFactory.create(
         disposableOwner,
         { target: date }
      );
      observer = observerProxyPair.observer;
      disposableOwner.canDispose.mockReturnValue(true);

      const id =   dateProxyFactory.getId({ date });
      expect(id).toBeDefined();

      expect(dateProxyFactory.getFromId(id)).toBeDefined();

      observer.dispose();

      expect(dateProxyFactory.getFromId(id)).toBeUndefined();
   });
});
