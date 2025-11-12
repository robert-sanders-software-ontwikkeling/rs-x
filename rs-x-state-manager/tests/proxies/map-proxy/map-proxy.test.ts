import { echo, IPropertyChange, truePredicate, WaitForEvent } from '@rs-x-core';
import { IObserverProxyPair } from '../../../lib/object-property-observer-proxy-pair-manager.type';
import { MapProxyFactory } from '../../../lib/proxies/map-proxy/map-proxy.factory';
import { IMapProxifyData } from '../../../lib/proxies/map-proxy/map-proxy.factory.type';
import { ProxyRegistryMock } from '../../../lib/testing/proxies/proxy-registry.mock';

describe('MapProxy tests', () => {
   let observerProxyPair: IObserverProxyPair<Map<unknown, unknown>, string>;
   let mapData: IMapProxifyData;
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

      mapData = {
         map: new Map([
            ['a', 1],
            ['b', 2],
         ]),
         proxifyItem,
         unproxifyItem,
         mustProxify: truePredicate,
      };

      observerProxyPair = new MapProxyFactory(new ProxyRegistryMock()).create(
         mapData
      ).instance;

      proxifyItem.mockClear();
   });

   it('create will register the array proxy to the proxy registry', () => {
      const proxyRegistry = new ProxyRegistryMock();
      const setProxyFactory = new MapProxyFactory(proxyRegistry);
      const { proxy } = setProxyFactory.create({ map: new Map() }).instance;

      expect(proxyRegistry.register).toHaveBeenCalledTimes(1);
      expect(proxyRegistry.register.mock.calls[0][0]).toBe(proxy);
   });

   it('dispose will unregister the array proxy to the proxy registry', () => {
      const proxyRegistry = new ProxyRegistryMock();
      const setProxyFactory = new MapProxyFactory(proxyRegistry);
      const { proxy, observer } = setProxyFactory.create({
         map: new Map(),
      }).instance;

      observer.dispose();

      expect(proxyRegistry.unregister).toHaveBeenCalledTimes(1);
      expect(proxyRegistry.register.mock.calls[0][0]).toBe(proxy);
   });

   it('items are proxified when map proxy is initialized and mustProxify return true for an item', () => {
      proxifyItem = jest.fn();
      mustProxify = jest.fn();
      mustProxify.mockImplementation((index) => {
         return index === 'b';
      });

      const mapData: IMapProxifyData = {
         map: new Map([
            ['a', 1],
            ['b', 2],
         ]),
         proxifyItem,
         unproxifyItem: null,
         mustProxify,
      };

      const observer = new MapProxyFactory(new ProxyRegistryMock()).create(
         mapData
      ).instance.observer;

      expect(proxifyItem).not.toHaveBeenCalled();
      expect(mustProxify).not.toHaveBeenCalled();

      observer.init();

      expect(mustProxify).toHaveBeenCalledTimes(2);
      expect(mustProxify).toHaveBeenNthCalledWith(1, 'a', mapData.map);
      expect(mustProxify).toHaveBeenNthCalledWith(2, 'b', mapData.map);

      expect(proxifyItem).toHaveBeenCalledTimes(1);
      expect(proxifyItem).toHaveBeenCalledWith(2, mapData.map, 'b');
   });

   it('items are unproxified when map proxy is disposed and mustProxify return true for an item', () => {
      unproxifyItem = jest.fn();
      mustProxify = jest.fn();
      mustProxify.mockImplementation((index) => {
         return index === 'b';
      });

      const mapData: IMapProxifyData = {
         map: new Map([
            ['a', 1],
            ['b', 2],
         ]),
         unproxifyItem,
         mustProxify,
      };

      const observer = new MapProxyFactory(new ProxyRegistryMock()).create(
         mapData
      ).instance.observer;

      observer.dispose();

      expect(mustProxify).toHaveBeenCalledTimes(2);
      expect(mustProxify).toHaveBeenNthCalledWith(1, 'a', mapData.map);
      expect(mustProxify).toHaveBeenNthCalledWith(2, 'b', mapData.map);

      expect(unproxifyItem).toHaveBeenCalledTimes(1);
      expect(unproxifyItem).toHaveBeenCalledWith(2, mapData.map, 'b');
   });

   it('items are not proxified when map proxy is created without mustProxify handler', () => {
      proxifyItem = jest.fn();
      proxifyItem.mockImplementation(echo);

      const mapData: IMapProxifyData = {
         map: new Map([
            ['a', 1],
            ['b', 2],
         ]),
         proxifyItem,
         unproxifyItem: null,
      };

      new MapProxyFactory(new ProxyRegistryMock())
         .create(mapData)
         .instance.observer.init();

      expect(proxifyItem).not.toHaveBeenCalled();
   });

   it('we can create an recursive and non-recursive proxy', () => {
      const mapProxyFactory = new MapProxyFactory(new ProxyRegistryMock());
      const map = new Map([
         ['a', 1],
         ['b', 2],
      ]);

      const { observer: recursiveObserver } = mapProxyFactory.create({
         map,
         mustProxify: truePredicate,
      }).instance;
      const { observer: nonRecursiveObserver } = mapProxyFactory.create({
         map,
      }).instance;

      expect(recursiveObserver).not.toBe(nonRecursiveObserver);
   });

   it('dispose will unregister proxy when all references are released', () => {
      const mapProxyFactory = new MapProxyFactory(new ProxyRegistryMock());
      const map = new Map([
         ['a', 1],
         ['b', 2],
      ]);

      const { observer: observer1, id: id1 } = mapProxyFactory.create({
         map,
         mustProxify: truePredicate,
         unproxifyItem,
      }).instance;
      const { observer: observer2, id: id2 } = mapProxyFactory.create({
         map,
         mustProxify: truePredicate,
         unproxifyItem,
      }).instance;

      expect(observer1).toBe(observer2);
      expect(id1).toBe(id2);
      expect(mapProxyFactory.getFromId(id1)).toBeDefined();

      observer1.dispose();

      expect(unproxifyItem).not.toHaveBeenCalled();
      expect(mapProxyFactory.getFromId(id2)).toBeDefined();

      observer2.dispose();
      expect(unproxifyItem).toHaveBeenCalledTimes(2);
      expect(mapProxyFactory.getFromId(id2)).toBeUndefined();
   });

   it('set will call unproxifyitem if key allready exists', () => {
      observerProxyPair.proxy.set('b', 3);

      expect(unproxifyItem).toHaveBeenCalledTimes(1);
      expect(unproxifyItem).toHaveBeenCalledWith(2, mapData.map, 'b');
   });

   it('set will call proxifyItem', () => {
      observerProxyPair.proxy.set('c', 3);

      expect(proxifyItem).toHaveBeenCalledTimes(1);
      expect(proxifyItem).toHaveBeenCalledWith(3, mapData.map, 'c');
      expect(unproxifyItem).not.toHaveBeenCalled();
   });

   it('delete will call unproxifyItem', () => {
      observerProxyPair.proxy.delete('a');

      expect(unproxifyItem).toHaveBeenCalledTimes(1);
      expect(unproxifyItem).toHaveBeenCalledWith(1, mapData.map, 'a');
   });

   it('clear will call unproxifyItem on all items', () => {
      observerProxyPair.proxy.clear();

      expect(unproxifyItem).toHaveBeenCalledTimes(2);
      expect(unproxifyItem).toHaveBeenNthCalledWith(1, 1, mapData.map, 'a');
      expect(unproxifyItem).toHaveBeenNthCalledWith(2, 2, mapData.map, 'b');
   });

   describe('all map operation still work as before', () => {
      it('size', () => {
         expect(observerProxyPair.proxy.size).toEqual(2);
      });

      it('get', () => {
         expect(observerProxyPair.proxy.get('a')).toEqual(1);
         expect(observerProxyPair.proxy.get('b')).toEqual(2);
      });

      it('has', () => {
         expect(observerProxyPair.proxy.has('a')).toEqual(true);
         expect(observerProxyPair.proxy.has('b')).toEqual(true);
         expect(observerProxyPair.proxy.has('c')).toEqual(false);
      });

      it('entries', () => {
         expect(Array.from(observerProxyPair.proxy.entries())).toEqual([
            ['a', 1],
            ['b', 2],
         ]);
      });

      it('forEach', () => {
         const actual = [];
         observerProxyPair.proxy.forEach((value, key) =>
            actual.push([key, value])
         );

         expect(actual).toEqual([
            ['a', 1],
            ['b', 2],
         ]);
      });

      it('values', () => {
         expect(Array.from(observerProxyPair.proxy.values())).toEqual([1, 2]);
      });

      it('keys', () => {
         expect(Array.from(observerProxyPair.proxy.keys())).toEqual(['a', 'b']);
      });

      it('set', () => {
         const actual = observerProxyPair.proxy.set('c', 3);

         expect(actual).toBe(observerProxyPair.proxy);
         expect(mapData.map).toEqual(
            new Map([
               ['a', 1],
               ['b', 2],
               ['c', 3],
            ])
         );
      });

      it('delete', () => {
         const actual = observerProxyPair.proxy.delete('b');
         expect(actual).toEqual(true);
         expect(mapData.map).toEqual(new Map([['a', 1]]));
      });

      it('clear', () => {
         observerProxyPair.proxy.clear();
         expect(mapData.map).toEqual(new Map());
      });
   });

   describe('Change event', () => {
      it('set will trigger change event when adding new item', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed'
         ).wait(() => {
            observerProxyPair.proxy.set('c', 3);
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: mapData.map, id: 'c' }],
            id: 'c',
            newValue: 3,
            target: mapData.map,
            isNew: true,
         };
         expect(actual).toEqual(expected);
      });

      it('set will trigger change event when replacing item', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed'
         ).wait(() => {
            observerProxyPair.proxy.set('b', 20);
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: mapData.map, id: 'b' }],
            id: 'b',
            newValue: 20,
            target: mapData.map,
            isNew: false,
         };

         expect(actual).toEqual(expected);
      });

      it('delete will trigger change event', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed'
         ).wait(() => {
            observerProxyPair.proxy.delete('b');
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: mapData.map, id: 'b' }],
            id: 'b',
            newValue: undefined,
            target: mapData.map,
            isNew: false,
         };

         expect(actual).toEqual(expected);
      });

      it('clear will trigger change event', async () => {
         const actual = await new WaitForEvent(
            observerProxyPair.observer,
            'changed',
            { count: 2 }
         ).wait(() => {
            observerProxyPair.proxy.clear();
         });

         const expected: IPropertyChange[] = [
            {
               arguments: [],
               chain: [{ object: mapData.map, id: 'a' }],
               id: 'a',
               newValue: undefined,
               target: mapData.map,
               isNew: false,
            },
            {
               arguments: [],
               chain: [{ object: mapData.map, id: 'b' }],
               id: 'b',
               newValue: undefined,
               target: mapData.map,
               isNew: false,
            },
         ];

         expect(actual).toEqual(expected);
      });

      it('dispose will doing nothing when allready called', () => {
         observerProxyPair.observer.dispose();
         observerProxyPair.observer.dispose();

         expect(unproxifyItem).toHaveBeenCalledTimes(2);
      });

      it('dispose will restore orginal map', () => {
         const proxifyItem = (item: number) => item + 10;
         const unproxifyItem = (item: number) => item - 10;

         mapData = {
            map: new Map([
               ['a', 1],
               ['b', 2],
            ]),
            proxifyItem,
            unproxifyItem,
            mustProxify: truePredicate,
         };

         const observer = new MapProxyFactory(new ProxyRegistryMock()).create(
            mapData
         ).instance.observer;

         observer.init();

         expect(mapData.map).toEqual(
            new Map([
               ['a', 11],
               ['b', 12],
            ])
         );

         observer.dispose();

         expect(mapData.map).toEqual(
            new Map([
               ['a', 1],
               ['b', 2],
            ])
         );
      });
   });
});
