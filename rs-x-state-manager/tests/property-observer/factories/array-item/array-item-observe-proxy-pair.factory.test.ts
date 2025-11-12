import {
   InjectionContainer,
   IPropertyChange,
   truePredicate,
   WaitForEvent,
} from '@rs-x-core';
import { IArrayProxyFactory } from '../../../..//lib/proxies/array-proxy/array-proxy.factory.type';
import { IObserverProxyPair } from '../../../../lib/object-property-observer-proxy-pair-manager.type';
import { IObserver } from '../../../../lib/observer.interface';
import { IPropertyObserverProxyPairFactory } from '../../../../lib/property-observer/property-observer-proxy-pair.factory.interface';
import { RsXStateManagerInjectionTokens } from '../../../../lib/rs-x-state-manager-injection-tokes';
import { RsXStateManagerModule } from '../../../../lib/rs-x-state-manager.module';
import { DisposableOwnerMock } from '../../../../lib/testing/disposable-owner.mock';

describe('ArrayItemObserverProxyPairFactory tests', () => {
   let observer: IObserver;
   let disposableOwner: DisposableOwnerMock;
   let arrayProxyFactory: IArrayProxyFactory;
   let arrayItemObserverFactory: IPropertyObserverProxyPairFactory;

   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);
      arrayProxyFactory = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IArrayProxyFactory
      );
      arrayItemObserverFactory = InjectionContainer.get(
         RsXStateManagerInjectionTokens.ArrayItemObserverProxyPairFactory
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

   it('will observe item at given index for recursive observer', async () => {
      const nestedArray = [1];
      const array = [nestedArray];
      const mustProxify = (index) => index === 0;
      const observerProxPair = arrayItemObserverFactory.create(
         disposableOwner,
         array,
         { key: 0, mustProxify }
      ) as IObserverProxyPair<number[][], string>;
      observer = observerProxPair.observer;

      const arrayProxy = arrayProxyFactory.getFromData({
         array: array,
         mustProxify,
      }).proxy;
      const nestedArrayProxy = arrayProxyFactory.getFromData({
         array: nestedArray,
         mustProxify,
      }).proxy;

      expect(arrayProxy[0]).toBe(nestedArrayProxy);
   });

   it('will not observe item at given index for non-recusrive observer', async () => {
      const nestedArray = [1];
      const array = [nestedArray];
      const observerProxPair = arrayItemObserverFactory.create(
         disposableOwner,
         array,
         { key: 0 }
      ) as IObserverProxyPair<number[][], string>;
      observer = observerProxPair.observer;

      const nestedArrayProxy = arrayProxyFactory.getFromData({
         array: nestedArray,
      })?.proxy;
      const arrayProxy = arrayProxyFactory.getFromData({
         array: array,
      }).proxy;

      expect(nestedArrayProxy).toBeUndefined();
      expect(arrayProxy[0]).toBe(nestedArray);
   });

   describe('change event', () => {
      it('will emit change when replacing value at a certain index', async () => {
         const array = [1, 2, 3];
         observer = arrayItemObserverFactory.create(disposableOwner, array, {
            key: 1,
         }).observer;

         const arrayId = arrayProxyFactory.getId({
            array: array,
         });
         const arrayProxy = arrayProxyFactory.getFromId(arrayId)
            .proxy as number[];

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            arrayProxy[1] = 20;
         });

         const expected: IPropertyChange = {
            chain: [{ object: array, id: 1 }],
            arguments: [],
            target: array,
            hasRebindNested: false,
            id: 1,
            newValue: 20,
         };
         expect(actual).toEqual(expected);
      });

      it('will emit change event for recursive observer when changing nested array: deleting item', async () => {
         const array = [[1, 2]];
         const observerProxPair = arrayItemObserverFactory.create(
            disposableOwner,
            array,
            { key: 0, mustProxify: truePredicate }
         );
         observer = observerProxPair.observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            array[0].pop();
         });

         const expected: IPropertyChange = {
            arguments: [],
            target: array[0],
            chain: [
               { object: array, id: 0 },
               { object: array[0], id: 1 },
            ],
            id: 1,
            newValue: undefined,
            isNew: false,
         };
         expect(actual).toEqual(expected);
      });

      it('will emit change event for recursive observer when changing nested array: adding item', async () => {
         const array = [[1, 2]];
         const observerProxPair = arrayItemObserverFactory.create(
            disposableOwner,
            array,
            { key: 0, mustProxify: truePredicate }
         );
         observer = observerProxPair.observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            array[0].push(3);
         });

         const expected: IPropertyChange = {
            arguments: [],
            target: array[0],
            chain: [
               { object: array, id: 0 },
               { object: array[0], id: 2 },
            ],
            id: 2,
            newValue: 3,
            isNew: true,
         };
         expect(actual).toEqual(expected);
      });

      it('will not emit change when replacing value at a certain index with same value', async () => {
         const array = [1, 2, 3];
         observer = arrayItemObserverFactory.create(disposableOwner, array, {
            key: 1,
         }).observer;
         const arrayId = arrayProxyFactory.getId({
            array: array,
         });
         const arrayProxy = arrayProxyFactory.getFromId(arrayId)
            .proxy as number[];

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            arrayProxy[1] = 2;
         });

         expect(actual).toBeNull();
      });
   });
});
