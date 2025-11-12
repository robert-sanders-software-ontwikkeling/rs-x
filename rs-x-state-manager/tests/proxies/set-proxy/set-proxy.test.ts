import { echo, IPropertyChange, truePredicate, WaitForEvent } from '@rs-x-core';
import { SetProxyFactory } from '../../../lib/proxies/set-proxy/set-proxy.factory';
import {
   ISetObserverProxyPair,
   ISetProxifyData,
} from '../../../lib/proxies/set-proxy/set-proxy.factory.type';
import { ProxyRegistryMock } from '../../../lib/testing/proxies/proxy-registry.mock';

interface ISetItem {
   x: number;
   y?: number;
}

describe('SetProxy tests', () => {
   let observerProxyPair: ISetObserverProxyPair;
   let setData: ISetProxifyData;
   let item1: ISetItem;
   let item2: ISetItem;
   let proxifyItem: jest.Mock;
   let unproxifyItem: jest.Mock;

   beforeEach(() => {
      proxifyItem = jest.fn();
      proxifyItem.mockImplementation(echo);

      unproxifyItem = jest.fn();
      unproxifyItem.mockImplementation(echo);

      item1 = { x: 1 };
      item2 = { x: 2 };

      setData = {
         set: new Set([item1, item2]),
         proxifyItem,
         unproxifyItem,
         mustProxify: truePredicate,
      };

      observerProxyPair = new SetProxyFactory(new ProxyRegistryMock()).create(
         setData
      ).instance;

      proxifyItem.mockClear();
   });

   it('create will register the set proxy to the proxy registry', () => {
      const proxyRegistry = new ProxyRegistryMock();
      const setProxyFactory = new SetProxyFactory(proxyRegistry);
      const { proxy } = setProxyFactory.create({ set: new Set() }).instance;

      expect(proxyRegistry.register).toHaveBeenCalledTimes(1);
      expect(proxyRegistry.register.mock.calls[0][0]).toBe(proxy);
   });

   it('dispose will unregister the set proxy to the proxy registry', () => {
      const proxyRegistry = new ProxyRegistryMock();
      const setProxyFactory = new SetProxyFactory(proxyRegistry);
      const { proxy, observer } = setProxyFactory.create({
         set: new Set(),
      }).instance;

      observer.dispose();

      expect(proxyRegistry.unregister).toHaveBeenCalledTimes(1);
      expect(proxyRegistry.unregister.mock.calls[0][0]).toBe(proxy);
   });

   it('items are proxified when set proxy is created and initialized  when mustProxify returns true', () => {
      proxifyItem = jest.fn();
      proxifyItem.mockImplementation(echo);

      const setData: ISetProxifyData = {
         set: new Set([{ x: 1 }, { x: 2 }]),
         proxifyItem,
         unproxifyItem: null,
         mustProxify: truePredicate,
      };

      const observer = new SetProxyFactory(new ProxyRegistryMock()).create(
         setData
      ).instance.observer;
      expect(proxifyItem).not.toHaveBeenCalled();

      observer.init();

      expect(proxifyItem).toHaveBeenCalledTimes(2);
      expect(proxifyItem).toHaveBeenNthCalledWith(1, item1, setData.set, item1);
      expect(proxifyItem).toHaveBeenNthCalledWith(2, item2, setData.set, item2);
   });

   it('items are not proxified when set proxy is created with recursive = false', () => {
      proxifyItem = jest.fn();
      proxifyItem.mockImplementation(echo);

      const setData: ISetProxifyData = {
         set: new Set([{ x: 1 }, { x: 2 }]),
         proxifyItem,
      };

      new SetProxyFactory(new ProxyRegistryMock()).create(setData);

      expect(proxifyItem).not.toHaveBeenCalled();
   });

   it('we can create an recursive and non-recursive proxy', () => {
      const setProxyFactory = new SetProxyFactory(new ProxyRegistryMock());
      const set = new Set([{ x: 1 }, { x: 2 }]);
      proxifyItem = jest.fn();
      proxifyItem.mockImplementation(echo);

      const { observer: recursiveObserver } = setProxyFactory.create({
         set,
         proxifyItem,
         mustProxify: truePredicate,
      }).instance;
      const { observer: nonRecursiveObserver } = setProxyFactory.create({
         set,
      }).instance;

      expect(recursiveObserver).not.toBe(nonRecursiveObserver);
   });

   it('dispose will unregister proxy when all references are released', () => {
      const setProxyFactory = new SetProxyFactory(new ProxyRegistryMock());
      const set = new Set([{ x: 1 }, { x: 2 }]);

      const { observer: observer1, id: id1 } = setProxyFactory.create({
         set,
         mustProxify: truePredicate,
         unproxifyItem,
      }).instance;
      const { observer: observer2, id: id2 } = setProxyFactory.create({
         set,
         mustProxify: truePredicate,
         unproxifyItem,
      }).instance;

      expect(observer1).toBe(observer2);
      expect(id1).toBe(id2);
      expect(setProxyFactory.getFromId(id1)).toBeDefined();

      observer1.dispose();

      expect(unproxifyItem).not.toHaveBeenCalled();
      expect(setProxyFactory.getFromId(id2)).toBeDefined();

      observer2.dispose();
      expect(unproxifyItem).toHaveBeenCalledTimes(2);
      expect(setProxyFactory.getFromId(id2)).toBeUndefined();
   });

   it('add will call proxifyItem', () => {
      const newItem = { x: 3 };
      observerProxyPair.proxy.add(newItem);

      expect(proxifyItem).toHaveBeenCalledTimes(1);
      expect(proxifyItem).toHaveBeenCalledWith(newItem, setData.set, newItem);
      expect(unproxifyItem).not.toHaveBeenCalled();
   });

   it('delete will call unproxifyItem', () => {
      observerProxyPair.proxy.delete(item1);

      expect(unproxifyItem).toHaveBeenCalledTimes(1);
      expect(unproxifyItem).toHaveBeenCalledWith(item1, setData.set, item1);
   });

   it('clear will call unproxifyItem on all items', () => {
      observerProxyPair.proxy.clear();

      expect(unproxifyItem).toHaveBeenCalledTimes(2);
      expect(unproxifyItem).toHaveBeenNthCalledWith(
         1,
         item1,
         setData.set,
         item1
      );
      expect(unproxifyItem).toHaveBeenNthCalledWith(
         2,
         item2,
         setData.set,
         item2
      );
   });

   describe('all set operation still work as before', () => {
      it('size', () => {
         expect(observerProxyPair.proxy.size).toEqual(2);
      });

      it('has: can both use proxy as orginal item as key', () => {
         proxifyItem = jest.fn();
         proxifyItem.mockImplementation((x) => x + 10);
         const setData: ISetProxifyData = {
            set: new Set([1, 2]),
            proxifyItem,
            unproxifyItem: null,
            mustProxify: truePredicate,
         };

         const observerProxyPair = new SetProxyFactory(
            new ProxyRegistryMock()
         ).create(setData).instance;

         observerProxyPair.observer.init();

         expect(observerProxyPair.proxy.has(1)).toEqual(true);
         expect(observerProxyPair.proxy.has(11)).toEqual(true);
         expect(observerProxyPair.proxy.has(2)).toEqual(true);
         expect(observerProxyPair.proxy.has(12)).toEqual(true);
         expect(observerProxyPair.proxy.has({ x: 3 })).toEqual(false);
      });

      it('entries', () => {
         expect(Array.from(observerProxyPair.proxy.entries())).toEqual([
            [item1, item1],
            [item2, item2],
         ]);
      });

      it('forEach', () => {
         const actual = [];
         observerProxyPair.proxy.forEach((value, key) =>
            actual.push([key, value])
         );

         expect(actual).toEqual([
            [item1, item1],
            [item2, item2],
         ]);
      });

      it('values', () => {
         expect(Array.from(observerProxyPair.proxy.values())).toEqual([
            item1,
            item2,
         ]);
      });

      it('keys', () => {
         expect(Array.from(observerProxyPair.proxy.keys())).toEqual([
            item1,
            item2,
         ]);
      });

      it('add', () => {
         const item3 = { x: 3 };
         const actual = observerProxyPair.proxy.add(item3);

         expect(actual).toBe(observerProxyPair.proxy);
         expect(setData.set).toEqual(new Set([item1, item2, item3]));
      });

      it('delete', () => {
         const actual = observerProxyPair.proxy.delete(item2);
         expect(actual).toEqual(true);
         expect(setData.set).toEqual(new Set([item1]));
      });

      it('clear', () => {
         observerProxyPair.proxy.clear();
         expect(setData.set).toEqual(new Set());
      });
   });

   describe('Change event', () => {
      it('add will trigger change event when adding new item', async () => {
         const newItem = { x: 3 };

         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed'
         ).wait(() => {
            observerProxyPair.proxy.add(newItem);
         });

         const expected: IPropertyChange = {
            arguments: [newItem],
            chain: [],
            id: 'add',
            newValue: setData.set,
            target: setData.set,
         };
         expect(actual).toEqual(expected);
      });

      it('delete will trigger change event', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed'
         ).wait(() => {
            observerProxyPair.proxy.delete(item1);
         });

         const expected: IPropertyChange = {
            arguments: [item1],
            chain: [],
            id: 'delete',
            newValue: setData.set,
            target: setData.set,
         };

         expect(actual).toEqual(expected);
      });

      it('clear will trigger change event', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed'
         ).wait(() => {
            observerProxyPair.proxy.clear();
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [],
            id: 'clear',
            newValue: setData.set,
            target: setData.set,
         };

         expect(actual).toEqual(expected);
      });

      it('dispose will doing nothing when allready called', () => {
         observerProxyPair.observer.dispose();
         observerProxyPair.observer.dispose();

         expect(unproxifyItem).toHaveBeenCalledTimes(2);
      });

      it('dispose will restore orginal set', () => {
         const proxifyItem = (item: ISetItem) => {
            item.y = item.x + 10;
            return item;
         };
         const unproxifyItem = (item: ISetItem) => {
            item.y = undefined;
            return item;
         };

         setData = {
            set: new Set([item1, item2]),
            proxifyItem,
            unproxifyItem,
            mustProxify: truePredicate,
         };

         const observer = new SetProxyFactory(new ProxyRegistryMock()).create(
            setData
         ).instance.observer;

         observer.init();

         expect(setData.set).toEqual(
            new Set([
               { x: 1, y: 11 },
               { x: 2, y: 12 },
            ])
         );

         observer.dispose();

         expect(setData.set).toEqual(new Set([{ x: 1 }, { x: 2 }]));
      });
   });
});
