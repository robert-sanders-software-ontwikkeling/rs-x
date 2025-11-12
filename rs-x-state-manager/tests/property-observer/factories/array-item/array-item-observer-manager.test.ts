import {
   InjectionContainer,
   IPropertyChange,
   truePredicate,
   WaitForEvent,
} from '@rs-x-core';
import { IArrayItemObserverManager } from '../../../../lib/property-observer/factories/array-item/array-item-observer-manager.type';
import { IArrayProxyFactory } from '../../../../lib/proxies/array-proxy/array-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../../../lib/rs-x-state-manager-injection-tokes';
import { RsXStateManagerModule } from '../../../../lib/rs-x-state-manager.module';

describe('IArrayItemObserverManager tests', () => {
   let arrayItemObserverManager: IArrayItemObserverManager;
   let arrayProxyFactory: IArrayProxyFactory;

   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);

      arrayProxyFactory = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IArrayProxyFactory
      );
      arrayItemObserverManager = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IArrayItemObserverManager
      );
   });

   afterAll(async () => {
      await InjectionContainer.unload(RsXStateManagerModule);
   });

   afterEach(() => {
      arrayItemObserverManager.dispose();
   });

   it('will use index as id when mustProxify is not set', () => {
      const array = [1, 2];
      const actual = arrayItemObserverManager
         .create(array)
         .instance.create({ index: 1 }).id;

      expect(actual).toEqual(1);
   });

   it('will use mustProxify handler as id if set', () => {
      const array = [1, 2];
      const actual = arrayItemObserverManager
         .create(array)
         .instance.create({ index: 1, mustProxify: truePredicate }).id;

      expect(actual).toBe(truePredicate);
   });

   it('will not release  the array proxy when releasing a array item but there are still other items registered', async () => {
      const array = [1, 2];
      const observer = arrayItemObserverManager
         .create(array)
         .instance.create({ index: 0 }).instance;
      arrayItemObserverManager.create(array).instance.create({ index: 1 });

      observer.dispose();

      const actual = arrayProxyFactory.getId({
         array: array,
      });
      expect(actual).toBeDefined();
   });

   it('will release the array proxy when releasing a array item and their are no other items registered', async () => {
      const array = [1];
      const observer = arrayItemObserverManager
         .create(array)
         .instance.create({ index: 0 }).instance;

      observer.dispose();

      const actual = arrayProxyFactory.getId({
         array: array,
      });
      expect(actual).toBeUndefined();
   });

   it('will release observer when disposing observed index', async () => {
      const array = [1, 2];
      const observer = arrayItemObserverManager
         .create(array)
         .instance.create({ index: 0 }).instance;

      const arrayIndexObserverManager =
         arrayItemObserverManager.getFromId(array);

      expect(arrayIndexObserverManager).toBeDefined();
      expect(arrayIndexObserverManager.getFromId(0)).toBeDefined();

      observer.dispose();

      expect(arrayItemObserverManager.getFromId(array)).toBeUndefined();
      expect(arrayIndexObserverManager.isEmpty).toEqual(true);
   });

   describe('change event', () => {
      it('will emit  change event when deleting item: index <= array.length', async () => {
         const array = [1, 2];
         const observer = arrayItemObserverManager
            .create(array)
            .instance.create({ index: 1 }).instance;
         const proxy = arrayProxyFactory.getFromData({ array }).proxy;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            proxy.length = 1;
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: array, id: 1 }],
            target: array,
            id: 1,
            newValue: undefined,
            isNew: false,
         };
         expect(actual).toEqual(expected);
      });

      it('will emit change event when removing element', async () => {
         const array = [1, 2, 3];
         const observer = arrayItemObserverManager
            .create(array)
            .instance.create({ index: 2 }).instance;
         const proxy = arrayProxyFactory.getFromData({ array }).proxy;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            proxy.pop();
         });

         expect(actual).toEqual({
            arguments: [],
            chain: [{ object: array, id: 2 }],
            target: array,
            id: 2,
            newValue: undefined,
            isNew: false,
         });
      });

      it('will not emit change if value does not change', async () => {
         const array = [1, 2, 2];
         const observer = arrayItemObserverManager
            .create(array)
            .instance.create({ index: 1 }).instance;
         const proxy = arrayProxyFactory.getFromData({ array }).proxy;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            proxy.shift();
         });

         expect(actual).toBeNull();
      });
   });
});
