import {
   type IPropertyChange,
   Type,
   WaitForEvent
} from '@rs-x/core';

import { ArrayProxyFactory } from '../../../lib/proxies/array-proxy/array-proxy.factory';
import {
   type IArrayObserverProxyPair,
   type IArrayProxyData,
} from '../../../lib/proxies/array-proxy/array-proxy.factory.type';
import { ProxyRegistryMock } from '../../../lib/testing/proxies/proxy-registry.mock';

describe('ArrayProxy tests', () => {
   let observerProxyPair: IArrayObserverProxyPair;
   let arrayData: IArrayProxyData;
   let proxyRegistry: ProxyRegistryMock;

   beforeEach(() => {
      arrayData = { array: [1, 2, 3, 4] };
      proxyRegistry = new ProxyRegistryMock();
      observerProxyPair = new ArrayProxyFactory(proxyRegistry).create(
         arrayData
      ).instance;
   });

   it('create will register the array proxy to the proxy registry', () => {
      const array = [];
      const proxyRegistry = new ProxyRegistryMock();
      const setProxyFactory = new ArrayProxyFactory(proxyRegistry);
      const { proxy } = setProxyFactory.create({ array }).instance;

      expect(proxyRegistry.register).toHaveBeenCalledTimes(1);
      expect(proxyRegistry.register.mock.calls[0][0]).toBe(array);
      expect(proxyRegistry.register.mock.calls[0][1]).toBe(proxy);
   });

   it('dispose will unregister the array proxy to the proxy registry', () => {
      const array = [];
      const proxyRegistry = new ProxyRegistryMock();
      const setProxyFactory = new ArrayProxyFactory(proxyRegistry);
      const { observer } = setProxyFactory.create({ array }).instance;

      observer.dispose();

      expect(proxyRegistry.unregister).toHaveBeenCalledTimes(1);
      expect(proxyRegistry.unregister).toHaveBeenCalledWith(array);
   });

    it('dispose is idempotent', () => {
      observerProxyPair.observer.dispose();
      observerProxyPair.observer.dispose();

      expect(proxyRegistry.unregister).toHaveBeenCalledTimes(1);
   });

   describe('All array operation still work as before', () => {
      it('push', () => {
         const length = Type.cast<number[]>(observerProxyPair.proxy).push(100, 200);
         expect(length).toEqual(6);
         expect([...Type.cast<number[]>(observerProxyPair.proxy)]).toEqual([1, 2, 3, 4, 100, 200]);
      });

      it('splice', () => {
         const deleteItems = Type.cast<number[]>(observerProxyPair.proxy).splice(
            1,
            2,
            100,
            200,
            300
         );
         expect(deleteItems).toEqual([2, 3]);
         expect([...Type.cast<number[]>(observerProxyPair.proxy)]).toEqual([1, 100, 200, 300, 4]);
      });

      it('pop', () => {
         const deletedItem = Type.cast<number[]>(observerProxyPair.proxy).pop();
         expect(deletedItem).toEqual(4);
         expect([...Type.cast<number[]>(observerProxyPair.proxy)]).toEqual([1, 2, 3]);
      });

      it('shift', () => {
         const deletedItem = Type.cast<number[]>(observerProxyPair.proxy).shift();
         expect(deletedItem).toEqual(1);
         expect([...Type.cast<number[]>(observerProxyPair.proxy)]).toEqual([2, 3, 4]);
      });

      it('unshift', () => {
         const newLength = Type.cast<number[]>(observerProxyPair.proxy).unshift(0, -1);
         expect(newLength).toEqual(6);
         expect([...Type.cast<number[]>(observerProxyPair.proxy)]).toEqual([0, -1, 1, 2, 3, 4]);
      });

      it('reverse', () => {
         const reverseArray = Type.cast<number[]>(observerProxyPair.proxy).reverse();
         expect(reverseArray).toEqual([4, 3, 2, 1]);
         expect([...Type.cast<number[]>(observerProxyPair.proxy)]).toEqual([4, 3, 2, 1]);
      });

      it('sort', () => {
         const sortedArray = Type.cast<number[]>(observerProxyPair.proxy).sort(
            (a: number, b: number) => b - a
         );
         expect(sortedArray).toEqual([4, 3, 2, 1]);
         expect([...Type.cast<number[]>(observerProxyPair.proxy)]).toEqual([4, 3, 2, 1]);
      });

      it('fill', () => {
         const filledArray = Type.cast<number[]>(observerProxyPair.proxy).fill(-1, 1, 3);
         expect(filledArray).toEqual([1, -1, -1, 4]);
         expect([...Type.cast<number[]>(observerProxyPair.proxy)]).toEqual([1, -1, -1, 4]);
      });

      it('increase length', () => {
         Type.cast<number[]>(observerProxyPair.proxy).length = 6;
         expect([...Type.cast<number[]>(observerProxyPair.proxy)]).toEqual([
            1,
            2,
            3,
            4,
            undefined,
            undefined,
         ]);
      });

      it('decrease length', () => {
         Type.cast<number[]>(observerProxyPair.proxy).length = 2;
         expect([...Type.cast<number[]>(observerProxyPair.proxy)]).toEqual([1, 2]);
      });
   });

   describe('Change event', () => {
      it('push will no trigger more change events than added elements', async () => {

         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed',
            { count: 3 }
         ).wait(() => {
            Type.cast<number[]>(observerProxyPair.proxy).push(10, 11);
         });

         expect(actual).toBeNull();
      });

      it('push will trigger change event for all added elements', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed',
            { count: 2 }
         ).wait(() => {
            Type.cast<number[]>(observerProxyPair.proxy).push(10, 11);
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 4 }],
               id: 4,
               newValue: 10,
               target: arrayData.array
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 5 }],
               id: 5,
               newValue: 11,
               target: arrayData.array
            },
         ];
         expect(actual).toEqual(expected);
      });

      it('splice will trigger change event for changed elements', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed',
            { count: 4 }
         ).wait(() => {
            Type.cast<number[]>(observerProxyPair.proxy).splice(1, 1, 10, 11);
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 1 }],
               id: 1,
               newValue: 10,
               target: arrayData.array
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 2 }],
               id: 2,
               newValue: 11,
               target: arrayData.array
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 3 }],
               id: 3,
               newValue: 3,
               target: arrayData.array
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 4 }],
               id: 4,
               newValue: 4,
               target: arrayData.array
            },
         ];
         expect(actual).toEqual(expected);
      });

      it('pop will trigger change event', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed'
         ).wait(() => {
            Type.cast<number[]>(observerProxyPair.proxy).pop();
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: arrayData.array, id: 3 }],
            id: 3,
            newValue: undefined,
            target: arrayData.array
         };
         expect(actual).toEqual(expected);
      });

      it('shift will trigger change event', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed',
            { count: 4 }
         ).wait(() => {
            Type.cast<number[]>(observerProxyPair.proxy).shift();
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 0 }],
               id: 0,
               newValue: 2,
               target: arrayData.array
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 1 }],
               id: 1,
               newValue: 3,
               target: arrayData.array
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 2 }],
               id: 2,
               newValue: 4,
               target: arrayData.array
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 3 }],
               id: 3,
               newValue: undefined,
               target: arrayData.array
            },
         ];
         expect(actual).toEqual(expected);
      });

      it('reverse will trigger change event for every element', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed',
            { count: 4 }
         ).wait(() => {
            Type.cast<number[]>(observerProxyPair.proxy).reverse();
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 0 }],
               id: 0,
               newValue: 4,
               target: arrayData.array
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 1 }],
               id: 1,
               newValue: 3,
               target: arrayData.array
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 2 }],
               id: 2,
               newValue: 2,
               target: arrayData.array
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 3 }],
               id: 3,
               newValue: 1,
               target: arrayData.array
            },
         ];
         expect(actual).toEqual(expected);
      });

      it('sort will trigger change event', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed',
            { count: 4 }
         ).wait(() => {
            Type.cast<number[]>(observerProxyPair.proxy).sort(
               (a, b) => Type.cast<number>(b) - Type.cast<number>(a)
            );
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 0 }],
               id: 0,
               newValue: 4,
               target: arrayData.array
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 1 }],
               id: 1,
               newValue: 3,
               target: arrayData.array
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 2 }],
               id: 2,
               newValue: 2,
               target: arrayData.array
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 3 }],
               id: 3,
               newValue: 1,
               target: arrayData.array
            },
         ];
         expect(actual).toEqual(expected);
      });

      it('unshift will trigger change event', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed',
            { count: 6 }
         ).wait(() => {
            Type.cast<number[]>(observerProxyPair.proxy).unshift(-1, 0);
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 0 }],
               id: 0,
               newValue: -1,
               target: arrayData.array
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 1 }],
               id: 1,
               newValue: 0,
               target: arrayData.array
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 2 }],
               id: 2,
               newValue: 1,
               target: arrayData.array
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 3 }],
               id: 3,
               newValue: 2,
               target: arrayData.array
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 4 }],
               id: 4,
               newValue: 3,
               target: arrayData.array
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 5 }],
               id: 5,
               newValue: 4,
               target: arrayData.array
            },
         ];
         expect(actual).toEqual(expected);
      });

      it('fill will trigger change event', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed',
            { count: 2 }
         ).wait(() => {
            Type.cast<number[]>(observerProxyPair.proxy).fill(-1, 1, 3);
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 1 }],
               id: 1,
               newValue: -1,
               target: arrayData.array
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 2 }],
               id: 2,
               newValue: -1,
               target: arrayData.array
            },
         ];
         expect(actual).toEqual(expected);
      });

      it('Set length will trigger change event when new length < old length', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed',
            { count: 2 }
         ).wait(() => {
            Type.cast<number[]>(observerProxyPair.proxy).length = 2;
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 2 }],
               id: 2,
               newValue: undefined,
               target: arrayData.array
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 3 }],
               id: 3,
               newValue: undefined,
               target: arrayData.array
            },
         ];
         expect(actual).toEqual(expected);
      });

      it('Set length will trigger not change event when new length > old length', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed'
         ).wait(() => {
            Type.cast<number[]>(observerProxyPair.proxy).length = 5;
         });

         expect(actual).toBeNull();
      });

      it('Set value  will trigger change event', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed'
         ).wait(() => {
            Type.cast<number[]>(observerProxyPair.proxy)[2] = 100;
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: arrayData.array, id: 2 }],
            id: 2,
            newValue: 100,
            target: arrayData.array
         };
         expect(actual).toEqual(expected);
      });
   });
});
