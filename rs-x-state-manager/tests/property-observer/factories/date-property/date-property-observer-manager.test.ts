import { InjectionContainer, type IPropertyChange, WaitForEvent } from '@rs-x/core';

import { type IDatePropertyObserverManager } from '../../../../lib/property-observer/factories/date-property/date-property-observer-manager.type';
import { type IProxyRegistry } from '../../../../lib/proxies/proxy-registry/proxy-registry.interface';
import { RsXStateManagerModule } from '../../../../lib/rs-x-state-manager.module';
import { RsXStateManagerInjectionTokens } from '../../../../lib/rs-x-state-manager-injection-tokes';

describe('IDatePropertyObserverManager tests', () => {
   let datePropertyObserverManager: IDatePropertyObserverManager;
   let proxyRegister: IProxyRegistry;


   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);

      proxyRegister = InjectionContainer.get(RsXStateManagerInjectionTokens.IProxyRegistry);
      datePropertyObserverManager = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IDatePropertyObserverManager
      );
   });

   afterAll(async () => {
      await InjectionContainer.unload(RsXStateManagerModule);
   });

   afterEach(() => {
      datePropertyObserverManager.dispose();
   });

   it('will not observer slot change for unregistered indexes', async () => {
      const date = new Date(2021, 1, 3);
      const observer = datePropertyObserverManager
         .create(date)
         .instance.create({ index: 'year' }).instance;
      const dateProxy = proxyRegister.getProxy<Date>(date);

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         dateProxy.setMonth(4);
      });

      expect(actual).toBeNull();
   });

   it('will release the date proxy when releasing a array item and their are no other items registered', async () => {
      const date = new Date(2021, 1, 3);
      const observer = datePropertyObserverManager
         .create(date)
         .instance.create({ index: 'year' }).instance;

      expect(proxyRegister.getProxy(date)).toBeDefined();

      observer.dispose();

      expect(proxyRegister.getProxy(date)).toBeUndefined();
   });

   it('will release observers when all references have nee disposed', async () => {
      const date = new Date(2021, 1, 3);
      const observerForDatePropertyManager = datePropertyObserverManager.create(date);
     
      const observer1 = observerForDatePropertyManager
         .instance.create({ index: 'year' }).instance;
      const observer2 = observerForDatePropertyManager
         .instance.create({ index: 'year' }).instance;


      observer1.dispose();

      expect(datePropertyObserverManager.getFromId(date)).toBeDefined();
      expect(proxyRegister.getProxy(date)).toBeDefined();

      observer2.dispose();

      expect(datePropertyObserverManager.getFromId(date)).toBeUndefined();
      expect(proxyRegister.getProxy(date)).toBeUndefined();
   });

   describe('change event', () => {
      it('will not observer slot change for unregistered indexes', async () => {
         const date = new Date(2021, 1, 3);
         const observer = datePropertyObserverManager
            .create(date)
            .instance.create({ index: 'year' }).instance;
         const dateProxy = proxyRegister.getProxy<Date>(date);

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            dateProxy.setMonth(3);
         });

         expect(actual).toBeNull();
      });

      it('will emit  change event when changing observed property', async () => {
         const date = new Date(2021, 1, 3);
         const observer = datePropertyObserverManager
            .create(date)
            .instance.create({ index: 'year' }).instance;
         const dateProxy = proxyRegister.getProxy<Date>(date);

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            dateProxy.setFullYear(2024);
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: date, id: 'year' }],
            target: date,
            newValue: 2024,
            id: 'year'
         };
         expect(actual).toEqual(expected);
      });

      it('will not emit change if value does not change', async () => {
         const date = new Date(2021, 1, 3);
         const observer = datePropertyObserverManager
            .create(date)
            .instance.create({ index: 'year' }).instance;
         const dateProxy = proxyRegister.getProxy<Date>(date);

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            dateProxy.setFullYear(2021);
         });

         expect(actual).toBeNull();
      });
   });
});
