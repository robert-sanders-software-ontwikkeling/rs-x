import { InjectionContainer, IPropertyChange, WaitForEvent } from '@rs-x/core';
import { IMapItemObserverManager } from '../../../../lib/property-observer/factories/map-item/map-item-observer-manager.type';
import { IMapProxyFactory } from '../../../../lib/proxies/map-proxy/map-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../../../lib/rs-x-state-manager-injection-tokes';
import { RsXStateManagerModule } from '../../../../lib/rs-x-state-manager.module';

describe('IMapItemObserverManager tests', () => {
   let mapItemObserverManager: IMapItemObserverManager;
   let mapProxyFactory: IMapProxyFactory;

   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);

      mapProxyFactory = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IMapProxyFactory
      );
      mapItemObserverManager = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IMapItemObserverManager
      );
   });

   afterAll(async () => {
      await InjectionContainer.unload(RsXStateManagerModule);
   });

   afterEach(() => {
      mapItemObserverManager.dispose();
   });

   it('will not observer slot change for unregistered indexes', async () => {
      const map = new Map([
         ['a', 1],
         ['b', 2],
      ]);
      const observer = mapItemObserverManager
         .create(map)
         .instance.create({ index: 'b' }).instance;
      const mapProxy = mapProxyFactory.getFromData({ map }).proxy as Map<
         string,
         number
      >;

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         mapProxy.set('a', 10);
      });

      expect(actual).toBeNull();
   });

   it('will release the map proxy when releasing a array item and their are no other items registered', async () => {
      const map = new Map([
         ['a', 1],
         ['b', 2],
      ]);
      const observer = mapItemObserverManager
         .create(map)
         .instance.create({ index: 'a' }).instance;

      expect(mapProxyFactory.getFromData({ map })).toBeDefined();

      observer.dispose();

      expect(mapProxyFactory.getFromData({ map })).toBeUndefined();
   });

   it('will release observers when all references have nee disposed', async () => {
      const map = new Map([
         ['a', 1],
         ['b', 2],
      ]);

      const mapKeyObserverManager = mapItemObserverManager.create(map)

      const observer1 = mapKeyObserverManager.instance.create({ index: 'a' }).instance;
      const observer2 = mapKeyObserverManager.instance.create({ index: 'a' }).instance

      observer1.dispose();

      expect(mapItemObserverManager.getFromId(map)).toBeDefined();
      expect(mapProxyFactory.getFromData({ map })).toBeDefined();

      expect(mapItemObserverManager.getFromId(map)).toBeDefined();
      expect(mapProxyFactory.getFromData({ map })).toBeDefined();

      observer2.dispose();

      expect(mapItemObserverManager.getFromId(map)).toBeUndefined();
      expect(mapProxyFactory.getFromData({ map })).toBeUndefined();
   });

   describe('change event', () => {
      it('will not observer slot change for unregistered indexes', async () => {
         const map = new Map([
            ['a', 1],
            ['b', 2],
         ]);
         const observer = mapItemObserverManager
            .create(map)
            .instance.create({ index: 'b' }).instance;
         const mapProxy = mapProxyFactory.getFromData({ map }).proxy as Map<
            string,
            number
         >;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            mapProxy.set('a', 10);
         });

         expect(actual).toBeNull();
      });
      it('will emit  change event when deleting item', async () => {
         const map = new Map([
            ['a', 1],
            ['b', 2],
         ]);
         const observer = mapItemObserverManager
            .create(map)
            .instance.create({ index: 'a' }).instance;
         const mapProxy = mapProxyFactory.getFromData({ map }).proxy as Map<
            string,
            number
         >;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            mapProxy.delete('a');
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: map, id: 'a' }],
            target: map,
            newValue: undefined,
            id: 'a',
            isNew: false,
         };
         expect(actual).toEqual(expected);
      });

      it('will emit change event when replacing element', async () => {
         const map = new Map([
            ['a', 1],
            ['b', 2],
         ]);
         const observer = mapItemObserverManager
            .create(map)
            .instance.create({ index: 'a' }).instance;
         const mapProxy = mapProxyFactory.getFromData({ map }).proxy as Map<
            string,
            number
         >;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            mapProxy.set('a', 10);
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: map, id: 'a' }],
            target: map,
            newValue: 10,
            id: 'a',
            isNew: false,
         };
         expect(actual).toEqual(expected);
      });

      it('will not emit change if value does not change', async () => {
         const map = new Map([
            ['a', 1],
            ['b', 2],
         ]);
         const observer = mapItemObserverManager
            .create(map)
            .instance.create({ index: 'a' }).instance;
         const mapProxy = mapProxyFactory.getFromData({ map }).proxy as Map<
            string,
            number
         >;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            mapProxy.set('a', 1);
         });

         expect(actual).toBeNull();
      });
   });
});
