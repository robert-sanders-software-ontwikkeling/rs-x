import {
   InjectionContainer,
   type IPropertyChange,
   Type,
   WaitForEvent
} from '@rs-x/core';
import { DisposableOwnerMock } from '@rs-x/core/testing';

import { type IProxyRegistry } from '../../../../lib';
import { type IObserver } from '../../../../lib/observer.interface';
import { type IDatePropertyObserverProxyPairFactory } from '../../../../lib/property-observer/factories/date-property/date-property-observer-proxy-pair.factory.type';
import { RsXStateManagerModule } from '../../../../lib/rs-x-state-manager.module';
import { RsXStateManagerInjectionTokens } from '../../../../lib/rs-x-state-manager-injection-tokes';

describe('IDatePropertyObserverProxyPairFactory tests', () => {
   let disposableOwner: DisposableOwnerMock;
   let observer: IObserver;
   let proxyRegistry: IProxyRegistry;
   let datePropertyObserverProxyPairFactory: IDatePropertyObserverProxyPairFactory;

   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);

      proxyRegistry = InjectionContainer.get(RsXStateManagerInjectionTokens.IProxyRegistry);
      datePropertyObserverProxyPairFactory = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IDatePropertyObserverProxyPairFactory
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
         observer = Type.cast(undefined)  ;
      }
   });

   it('will emit change when set date property to a new value', async () => {
      const date = new Date(2021, 2, 3)
      const { observer } = datePropertyObserverProxyPairFactory.create(
         disposableOwner,
         date,
         { key: 'year' }
      );

      const dateProxy = proxyRegistry.getProxy<Date>(date);

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         dateProxy.setFullYear(2024)
      });

      const expected: IPropertyChange = {
         arguments: [],
         chain: [{ object: date, id: 'year' }],
         target: date,
         id: 'year',
         newValue: 2024,
      };
      expect(actual).toEqual(expected);
   });
});
