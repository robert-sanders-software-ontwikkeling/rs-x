import { IPropertyChange, WaitForEvent } from '@rs-x/core';
import { SetProxyFactory } from '../../../lib/proxies/set-proxy/set-proxy.factory';
import {
   ISetObserverProxyPair,
   ISetProxifyData,
} from '../../../lib/proxies/set-proxy/set-proxy.factory.type';
import { ProxyRegistryMock } from '../../../lib/testing/proxies/proxy-registry.mock';


interface ISetItem {
   x: number;
}

describe('SetProxy tests', () => {
   let observerProxyPair: ISetObserverProxyPair;
   let setData: ISetProxifyData;
   let item1: ISetItem;
   let item2: ISetItem;
   let proxyRegistry: ProxyRegistryMock

   beforeEach(() => {
      item1 = { x: 1 };
      item2 = { x: 2 };

      setData = {
         set: new Set([item1, item2]),
      };

      proxyRegistry = new ProxyRegistryMock();
      observerProxyPair = new SetProxyFactory(proxyRegistry).create(
         setData
      ).instance;

   });

   it('create will register the set proxy to the proxy registry', () => {
      const set = new Set();
      const proxyRegistry = new ProxyRegistryMock();
      const setProxyFactory = new SetProxyFactory(proxyRegistry);
      const { proxy } = setProxyFactory.create({ set }).instance;

      expect(proxyRegistry.register).toHaveBeenCalledTimes(1);
      expect(proxyRegistry.register.mock.calls[0][0]).toBe(set);
      expect(proxyRegistry.register.mock.calls[0][1]).toBe(proxy);
   });

   it('dispose will unregister the set proxy to the proxy registry', () => {
      observerProxyPair.observer.dispose();
      expect(proxyRegistry.unregister).toHaveBeenCalledTimes(1);
   });

   it('dispose is idempotent', () => {
      observerProxyPair.observer.dispose();
      observerProxyPair.observer.dispose();

      expect(proxyRegistry.unregister).toHaveBeenCalledTimes(1);
   });

   describe('all set operation still work as before', () => {
      it('size', () => {
         expect(observerProxyPair.proxy.size).toEqual(2);
      });

      it('has', () => {
         const setData: ISetProxifyData = {
            set: new Set([1, 2]),
         };

         const observerProxyPair = new SetProxyFactory(
            new ProxyRegistryMock()
         ).create(setData).instance;

         expect(observerProxyPair.proxy.has(1)).toEqual(true);
         expect(observerProxyPair.proxy.has(2)).toEqual(true);
         expect(observerProxyPair.proxy.has(3)).toEqual(false);
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
            arguments: [],
            chain: [{ object: setData.set, id: newItem }],
            id: newItem,
            newValue: newItem,
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
            arguments: [],
            chain: [{ object: setData.set, id: item1 }],
            id: item1,
            newValue: undefined,
            target: setData.set,
         };

         expect(actual).toEqual(expected);
      });

      it('clear will trigger change event for every item', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed', { count: 2 }
         ).wait(() => {
            observerProxyPair.proxy.clear();
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: setData.set, id: item1 }],
               id: item1,
               newValue: undefined,
               target: setData.set,
            },
            {
               arguments: [],
               chain: [{ object: setData.set, id: item2 }],
               id: item2,
               newValue: undefined,
               target: setData.set,
            }
         ]

         expect(actual).toEqual(expected);
      });
   });
});
