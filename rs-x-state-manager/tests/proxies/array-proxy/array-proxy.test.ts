import {
   echo,
   IPropertyChange,
   truePredicate,
   Type,
   WaitForEvent,
} from '@rs-x-core';
import { ArrayProxyFactory } from '../../../lib/proxies/array-proxy/array-proxy.factory';
import {
   IArrayObserverProxyPair,
   IArrayProxyData,
} from '../../../lib/proxies/array-proxy/array-proxy.factory.type';
import { ProxyRegistryMock } from '../../../lib/testing/proxies/proxy-registry.mock';

describe('ArrayProxy tests', () => {
   let observerProxyPair: IArrayObserverProxyPair;
   let arrayData: IArrayProxyData;
   let proxifyItem: jest.Mock;
   let unproxifyItem: jest.Mock;
   let mustProxify: jest.Mock;

   beforeEach(() => {
      proxifyItem = jest.fn();
      proxifyItem.mockImplementation(echo);

      unproxifyItem = jest.fn();
      unproxifyItem.mockImplementation(echo);

      mustProxify = jest.fn();
      mustProxify.mockImplementation(truePredicate);

      arrayData = {
         array: [1, 2, 3, 4],
         proxifyItem,
         unproxifyItem,
         mustProxify,
      };

      observerProxyPair = new ArrayProxyFactory(new ProxyRegistryMock()).create(
         arrayData
      ).instance;

      proxifyItem.mockClear();
   });

   afterEach(() => {
      proxifyItem.mockClear();
      unproxifyItem.mockClear();
      mustProxify.mockClear();
   });

   it('create will register the array proxy to the proxy registry', () => {
      const proxyRegistry = new ProxyRegistryMock();
      const setProxyFactory = new ArrayProxyFactory(proxyRegistry);
      const { proxy } = setProxyFactory.create({ array: [] }).instance;

      expect(proxyRegistry.register).toHaveBeenCalledTimes(1);
      expect(proxyRegistry.register.mock.calls[0][0]).toBe(proxy);
   });

   it('dispose will unregister the array proxy to the proxy registry', () => {
      const proxyRegistry = new ProxyRegistryMock();
      const setProxyFactory = new ArrayProxyFactory(proxyRegistry);
      const { proxy, observer } = setProxyFactory.create({
         array: [],
      }).instance;

      observer.dispose();

      expect(proxyRegistry.unregister).toHaveBeenCalledTimes(1);
      expect(proxyRegistry.unregister.mock.calls[0][0]).toBe(proxy);
   });

   it('items are proxified when array proxy is initialized and mustProxify return true for an item', () => {
      proxifyItem = jest.fn();
      mustProxify = jest.fn();
      mustProxify.mockImplementation((index) => {
         return index === 1;
      });

      const arrayData: IArrayProxyData = {
         array: [1, 2],
         proxifyItem,
         mustProxify,
      };

      const observer = new ArrayProxyFactory(new ProxyRegistryMock()).create(
         arrayData
      ).instance.observer;

      expect(proxifyItem).not.toHaveBeenCalled();
      expect(mustProxify).not.toHaveBeenCalled();

      observer.init();

      expect(mustProxify).toHaveBeenCalledTimes(2);
      expect(mustProxify).toHaveBeenNthCalledWith(1, 0, arrayData.array);
      expect(mustProxify).toHaveBeenNthCalledWith(2, 1, arrayData.array);

      expect(proxifyItem).toHaveBeenCalledTimes(1);
      expect(proxifyItem).toHaveBeenCalledWith(2, arrayData.array, 1);
   });

   it('items are unproxified when array proxy is disposed and mustProxify return true for an item', () => {
      unproxifyItem = jest.fn();
      mustProxify = jest.fn();
      mustProxify.mockImplementation((index) => {
         return index === 1;
      });

      const arrayData: IArrayProxyData = {
         array: [1, 2],
         unproxifyItem,
         mustProxify,
      };

      const observer = new ArrayProxyFactory(new ProxyRegistryMock()).create(
         arrayData
      ).instance.observer;

      observer.dispose();

      expect(mustProxify).toHaveBeenCalledTimes(2);
      expect(mustProxify).toHaveBeenNthCalledWith(1, 0, arrayData.array);
      expect(mustProxify).toHaveBeenNthCalledWith(2, 1, arrayData.array);

      expect(unproxifyItem).toHaveBeenCalledTimes(1);
      expect(unproxifyItem).toHaveBeenCalledWith(2, arrayData.array, 1);
   });

   it('items are not proxified when array proxy is created with mustProxify without  calling init', () => {
      proxifyItem = jest.fn();
      proxifyItem.mockImplementation(echo);

      const arrayData: IArrayProxyData = {
         array: [1, 2],
         proxifyItem,
         unproxifyItem: null,
         mustProxify: truePredicate,
      };

      new ArrayProxyFactory(new ProxyRegistryMock()).create(arrayData);

      expect(proxifyItem).not.toHaveBeenCalled();
   });

   it('items are not proxified when array proxy is created with no mustProxify handler', () => {
      proxifyItem = jest.fn();
      proxifyItem.mockImplementation(echo);

      const arrayData: IArrayProxyData = {
         array: [1, 2],
         proxifyItem,
         unproxifyItem: null,
      };

      new ArrayProxyFactory(new ProxyRegistryMock())
         .create(arrayData)
         .instance.observer.init();

      expect(proxifyItem).not.toHaveBeenCalled();
   });

   it('we can create an recursive and non-recursive proxy', () => {
      const arrayProxyFactory = new ArrayProxyFactory(new ProxyRegistryMock());
      const array = [1, 2];

      const { observer: recursiveObserver } = arrayProxyFactory.create({
         array,
         mustProxify: truePredicate,
      }).instance;
      const { observer: nonRecursiveObserver } = arrayProxyFactory.create({
         array,
      }).instance;

      expect(recursiveObserver).not.toBe(nonRecursiveObserver);
   });

   it('dispose will unregister proxy when all references are released', () => {
      const arrayProxyFactory = new ArrayProxyFactory(new ProxyRegistryMock());
      const array = [1, 2];

      const { observer: observer1, id: id1 } = arrayProxyFactory.create({
         array,
         mustProxify: truePredicate,
         unproxifyItem,
      }).instance;
      const { observer: observer2, id: id2 } = arrayProxyFactory.create({
         array,
         mustProxify: truePredicate,
         unproxifyItem,
      }).instance;

      expect(observer1).toBe(observer2);
      expect(id1).toBe(id2);
      expect(arrayProxyFactory.getFromId(id1)).toBeDefined();

      observer1.dispose();

      expect(unproxifyItem).not.toHaveBeenCalled();
      expect(arrayProxyFactory.getFromId(id2)).toBeDefined();

      observer2.dispose();
      expect(unproxifyItem).toHaveBeenCalledTimes(2);
      expect(arrayProxyFactory.getFromId(id2)).toBeUndefined();
   });

   describe('proxifyItem will be called on added items when when recursive is true', () => {
      it('push', () => {
         observerProxyPair.proxy.push(100, 200);

         expect(proxifyItem).toHaveBeenCalledTimes(2);
         expect(proxifyItem).toHaveBeenNthCalledWith(
            1,
            100,
            arrayData.array,
            4
         );
         expect(proxifyItem).toHaveBeenNthCalledWith(
            2,
            200,
            arrayData.array,
            5
         );
      });

      it('unshift', () => {
         observerProxyPair.proxy.unshift(100, 200);
         expect(proxifyItem).toHaveBeenCalledTimes(2);
         expect(proxifyItem).toHaveBeenNthCalledWith(
            1,
            100,
            arrayData.array,
            0
         );
         expect(proxifyItem).toHaveBeenNthCalledWith(
            2,
            200,
            arrayData.array,
            1
         );
      });

      it('splice', () => {
         observerProxyPair.proxy.splice(1, 2, 100, 200);
         expect(proxifyItem).toHaveBeenCalledTimes(2);
         expect(proxifyItem).toHaveBeenNthCalledWith(
            1,
            100,
            arrayData.array,
            1
         );
         expect(proxifyItem).toHaveBeenNthCalledWith(
            2,
            200,
            arrayData.array,
            2
         );
      });

      it('fill', () => {
         observerProxyPair.proxy.fill(2);
         expect(proxifyItem).toHaveBeenCalledTimes(4);
         expect(proxifyItem).toHaveBeenNthCalledWith(1, 2, arrayData.array, 0);
         expect(proxifyItem).toHaveBeenNthCalledWith(2, 2, arrayData.array, 1);
         expect(proxifyItem).toHaveBeenNthCalledWith(3, 2, arrayData.array, 2);
         expect(proxifyItem).toHaveBeenNthCalledWith(4, 2, arrayData.array, 3);
      });

      it('set', () => {
         observerProxyPair.proxy[1] = 100;
         expect(proxifyItem).toHaveBeenCalledTimes(1);
         expect(proxifyItem).toHaveBeenCalledWith(100, arrayData.array, 1);
      });
   });

   describe('unproxifyItem will be called on added items', () => {
      it('splice', () => {
         observerProxyPair.proxy.splice(1, 2, 100, 200);
         expect(unproxifyItem).toHaveBeenCalledTimes(2);
         expect(unproxifyItem).toHaveBeenNthCalledWith(
            1,
            2,
            arrayData.array,
            1
         );
         expect(unproxifyItem).toHaveBeenNthCalledWith(
            2,
            3,
            arrayData.array,
            2
         );
      });

      it('shift', () => {
         observerProxyPair.proxy.shift();
         expect(unproxifyItem).toHaveBeenCalledTimes(1);
         expect(unproxifyItem).toHaveBeenCalledWith(1, arrayData.array, 0);
      });

      it('pop', () => {
         observerProxyPair.proxy.pop();
         expect(unproxifyItem).toHaveBeenCalledTimes(1);
         expect(unproxifyItem).toHaveBeenCalledWith(4, arrayData.array, 3);
      });

      it('set', () => {
         observerProxyPair.proxy[1] = 100;
         expect(unproxifyItem).toHaveBeenCalledTimes(1);
         expect(unproxifyItem).toHaveBeenCalledWith(2, arrayData.array, 1);
      });

      it('set length to smaller value', () => {
         observerProxyPair.proxy.length = 2;
         expect(unproxifyItem).toHaveBeenCalledTimes(2);
         expect(unproxifyItem).toHaveBeenNthCalledWith(
            1,
            3,
            arrayData.array,
            2
         );
         expect(unproxifyItem).toHaveBeenNthCalledWith(
            2,
            4,
            arrayData.array,
            3
         );
      });
   });

   describe('all array operation still work as before', () => {
      it('push', () => {
         const length = observerProxyPair.proxy.push(100, 200);
         expect(length).toEqual(6);
         expect([...observerProxyPair.proxy]).toEqual([1, 2, 3, 4, 100, 200]);
      });

      it('splice', () => {
         const deleteItems = observerProxyPair.proxy.splice(
            1,
            2,
            100,
            200,
            300
         );
         expect(deleteItems).toEqual([2, 3]);
         expect([...observerProxyPair.proxy]).toEqual([1, 100, 200, 300, 4]);
      });

      it('pop', () => {
         const deletedItem = observerProxyPair.proxy.pop();
         expect(deletedItem).toEqual(4);
         expect([...observerProxyPair.proxy]).toEqual([1, 2, 3]);
      });

      it('shift', () => {
         const deletedItem = observerProxyPair.proxy.shift();
         expect(deletedItem).toEqual(1);
         expect([...observerProxyPair.proxy]).toEqual([2, 3, 4]);
      });

      it('unshift', () => {
         const newLength = observerProxyPair.proxy.unshift(0, -1);
         expect(newLength).toEqual(6);
         expect([...observerProxyPair.proxy]).toEqual([0, -1, 1, 2, 3, 4]);
      });

      it('reverse', () => {
         const reverseArray = observerProxyPair.proxy.reverse();
         expect(reverseArray).toEqual([4, 3, 2, 1]);
         expect([...observerProxyPair.proxy]).toEqual([4, 3, 2, 1]);
      });

      it('sort', () => {
         const sortedArray = observerProxyPair.proxy.sort(
            (a: number, b: number) => b - a
         );
         expect(sortedArray).toEqual([4, 3, 2, 1]);
         expect([...observerProxyPair.proxy]).toEqual([4, 3, 2, 1]);
      });

      it('fill', () => {
         const filledArray = observerProxyPair.proxy.fill(-1, 1, 3);
         expect(filledArray).toEqual([1, -1, -1, 4]);
         expect([...observerProxyPair.proxy]).toEqual([1, -1, -1, 4]);
      });

      it('increase length', () => {
         observerProxyPair.proxy.length = 6;
         expect([...observerProxyPair.proxy]).toEqual([
            1,
            2,
            3,
            4,
            undefined,
            undefined,
         ]);
      });

      it('decrease length', () => {
         observerProxyPair.proxy.length = 2;
         expect([...observerProxyPair.proxy]).toEqual([1, 2]);
      });
   });

   describe('Change event', () => {
      it('push will trigger change event for all added elements', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed',
            { count: 2 }
         ).wait(() => {
            observerProxyPair.proxy.push(10, 11);
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 4 }],
               id: 4,
               newValue: 10,
               target: arrayData.array,
               isNew: true,
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 5 }],
               id: 5,
               newValue: 11,
               target: arrayData.array,
               isNew: true,
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
            observerProxyPair.proxy.splice(1, 1, 10, 11);
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 1 }],
               id: 1,
               newValue: 10,
               target: arrayData.array,
               isNew: false,
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 2 }],
               id: 2,
               newValue: 11,
               target: arrayData.array,
               isNew: false,
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 3 }],
               id: 3,
               newValue: 3,
               target: arrayData.array,
               isNew: false,
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 4 }],
               id: 4,
               newValue: 4,
               target: arrayData.array,
               isNew: true,
            },
         ];
         expect(actual).toEqual(expected);
      });

      it('pop will trigger change event', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed'
         ).wait(() => {
            observerProxyPair.proxy.pop();
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: arrayData.array, id: 3 }],
            id: 3,
            newValue: undefined,
            target: arrayData.array,
            isNew: false,
         };
         expect(actual).toEqual(expected);
      });

      it('shift will trigger change event', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed',
            { count: 4 }
         ).wait(() => {
            observerProxyPair.proxy.shift();
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 0 }],
               id: 0,
               newValue: 2,
               target: arrayData.array,
               isNew: false,
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 1 }],
               id: 1,
               newValue: 3,
               target: arrayData.array,
               isNew: false,
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 2 }],
               id: 2,
               newValue: 4,
               target: arrayData.array,
               isNew: false,
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 3 }],
               id: 3,
               newValue: undefined,
               target: arrayData.array,
               isNew: false,
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
            observerProxyPair.proxy.reverse();
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 0 }],
               id: 0,
               newValue: 4,
               target: arrayData.array,
               isNew: false,
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 1 }],
               id: 1,
               newValue: 3,
               target: arrayData.array,
               isNew: false,
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 2 }],
               id: 2,
               newValue: 2,
               target: arrayData.array,
               isNew: false,
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 3 }],
               id: 3,
               newValue: 1,
               target: arrayData.array,
               isNew: false,
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
            observerProxyPair.proxy.sort(
               (a, b) => Type.cast<number>(b) - Type.cast<number>(a)
            );
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 0 }],
               id: 0,
               newValue: 4,
               target: arrayData.array,
               isNew: false,
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 1 }],
               id: 1,
               newValue: 3,
               target: arrayData.array,
               isNew: false,
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 2 }],
               id: 2,
               newValue: 2,
               target: arrayData.array,
               isNew: false,
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 3 }],
               id: 3,
               newValue: 1,
               target: arrayData.array,
               isNew: false,
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
            observerProxyPair.proxy.unshift(-1, 0);
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 0 }],
               id: 0,
               newValue: -1,
               target: arrayData.array,
               isNew: false,
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 1 }],
               id: 1,
               newValue: 0,
               target: arrayData.array,
               isNew: false,
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 2 }],
               id: 2,
               newValue: 1,
               target: arrayData.array,
               isNew: false,
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 3 }],
               id: 3,
               newValue: 2,
               target: arrayData.array,
               isNew: false,
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 4 }],
               id: 4,
               newValue: 3,
               target: arrayData.array,
               isNew: true,
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 5 }],
               id: 5,
               newValue: 4,
               target: arrayData.array,
               isNew: true,
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
            observerProxyPair.proxy.fill(-1, 1, 3);
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 1 }],
               id: 1,
               newValue: -1,
               target: arrayData.array,
               isNew: false,
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 2 }],
               id: 2,
               newValue: -1,
               target: arrayData.array,
               isNew: false,
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
            observerProxyPair.proxy.length = 2;
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 2 }],
               id: 2,
               newValue: undefined,
               target: arrayData.array,
               isNew: false,
            },
            {
               arguments: [],
               chain: [{ object: arrayData.array, id: 3 }],
               id: 3,
               newValue: undefined,
               target: arrayData.array,
               isNew: false,
            },
         ];
         expect(actual).toEqual(expected);
      });

      it('Set length will trigger not change event when new length > old length', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed'
         ).wait(() => {
            observerProxyPair.proxy.length = 5;
         });

         expect(actual).toBeNull();
      });

      it('Set value  will trigger change event', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed'
         ).wait(() => {
            observerProxyPair.proxy[2] = 100;
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: arrayData.array, id: 2 }],
            id: 2,
            newValue: 100,
            target: arrayData.array,
            isNew: false,
         };
         expect(actual).toEqual(expected);
      });
   });
});
