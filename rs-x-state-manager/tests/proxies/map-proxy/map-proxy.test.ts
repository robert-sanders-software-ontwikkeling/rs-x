import { IPropertyChange, WaitForEvent } from '@rs-x/core';
import { MapProxyFactory } from '../../../lib/proxies/map-proxy/map-proxy.factory';
import { IMapObserverProxyPair, IMapProxifyData } from '../../../lib/proxies/map-proxy/map-proxy.factory.type';
import { ProxyRegistryMock } from '../../../lib/testing/proxies/proxy-registry.mock';

describe('MapProxy tests', () => {
   let observerProxyPair: IMapObserverProxyPair
   let mapData: IMapProxifyData;
   let proxyRegistry: ProxyRegistryMock


   beforeEach(() => {
      mapData = {
         map: new Map([
            ['a', 1],
            ['b', 2],
         ]),
      };

      proxyRegistry = new ProxyRegistryMock();
      observerProxyPair = new MapProxyFactory(proxyRegistry).create(mapData).instance;
   });

   it('create will register the array proxy to the proxy registry', () => {
      const map = new Map();
      const proxyRegistry = new ProxyRegistryMock();
      const setProxyFactory = new MapProxyFactory(proxyRegistry);
      const { proxy } = setProxyFactory.create({ map }).instance;

      expect(proxyRegistry.register).toHaveBeenCalledTimes(1);
      expect(proxyRegistry.register.mock.calls[0][0]).toBe(map);
      expect(proxyRegistry.register.mock.calls[0][1]).toBe(proxy);
   });

   it('dispose will unregister the array proxy to the proxy registry', () => {
      const map = new Map();
      const proxyRegistry = new ProxyRegistryMock();
      const setProxyFactory = new MapProxyFactory(proxyRegistry);
      const { observer } = setProxyFactory.create({ map }).instance;

      observer.dispose();

      expect(proxyRegistry.unregister).toHaveBeenCalledTimes(1);
      expect(proxyRegistry.unregister).toHaveBeenCalledWith(map);
   });


   it('dispose will unregister proxy when all references are released', () => {
       const proxyRegistry = new ProxyRegistryMock();
      const mapProxyFactory = new MapProxyFactory(proxyRegistry);
      const map = new Map([
         ['a', 1],
         ['b', 2],
      ]);

      const { observer: observer1 } = mapProxyFactory.create({
         map,

      }).instance;
      const { observer: observer2 } = mapProxyFactory.create({
         map,
      }).instance;

      expect(observer1).toBe(observer2);
      expect(mapProxyFactory.getFromId(map)).toBeDefined();

      observer1.dispose();
      ;
      expect(mapProxyFactory.getFromId(map)).toBeDefined();

      observer2.dispose();
      expect(proxyRegistry.unregister).toHaveBeenCalledTimes(1);
      expect(mapProxyFactory.getFromId(map)).toBeUndefined();
   });

   it('dispose is idempotent', () => {
      observerProxyPair.observer.dispose();
      observerProxyPair.observer.dispose();

      expect(proxyRegistry.unregister).toHaveBeenCalledTimes(1);
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
            target: mapData.map
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
            target: mapData.map
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
            target: mapData.map
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
               target: mapData.map
            },
            {
               arguments: [],
               chain: [{ object: mapData.map, id: 'b' }],
               id: 'b',
               newValue: undefined,
               target: mapData.map
            },
         ];

         expect(actual).toEqual(expected);
      });
   });
});
