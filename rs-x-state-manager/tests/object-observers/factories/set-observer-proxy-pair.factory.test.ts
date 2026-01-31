import { ErrorLog, InjectionContainer, type IPropertyChange, truePredicate, WaitForEvent } from '@rs-x/core';
import { DisposableOwnerMock } from '@rs-x/core/testing';

import { type ISetObserverProxyPairFactory } from '../../../lib/object-observer/factories/set-observer-proxy-pair.factory.type';
import { type IObjectPropertyObserverProxyPairManager } from '../../../lib/object-property-observer-proxy-pair-manager.type';
import { type IObserver } from '../../../lib/observer.interface';
import { ObserverGroup } from '../../../lib/observer-group';
import { type IProxyRegistry } from '../../../lib/proxies/proxy-registry/proxy-registry.interface';
import { type ISetObserverProxyPair, type ISetProxyFactory } from '../../../lib/proxies/set-proxy/set-proxy.factory.type';
import { RsXStateManagerModule } from '../../../lib/rs-x-state-manager.module';
import { RsXStateManagerInjectionTokens } from '../../../lib/rs-x-state-manager-injection-tokens';

describe('SetObserverProxyPairFactory tests', () => {
   let setObserverProxyPairFactory: ISetObserverProxyPairFactory;
   let setProxyFactory: ISetProxyFactory;
   let disposableOwner: DisposableOwnerMock;
   let observer: IObserver | undefined;

   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);
      setProxyFactory = InjectionContainer.get<ISetProxyFactory>(
         RsXStateManagerInjectionTokens.ISetProxyFactory
      );
      setObserverProxyPairFactory =
         InjectionContainer.get<ISetObserverProxyPairFactory>(
            RsXStateManagerInjectionTokens.ISetObserverProxyPairFactory
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
         observer = undefined;
      }
   });

   it('applies will return true when passed in value is Set', async () => {
      const actual = setObserverProxyPairFactory.applies(new Set());
      expect(actual).toEqual(true);
   });

   it('applies will return false when passed in value is not Set', async () => {
      const actual = setObserverProxyPairFactory.applies({});
      expect(actual).toEqual(false);
   });

   it('create will create a Set proxy', async () => {
      const set = new Set();
      const observerProxyPair = setObserverProxyPairFactory.create(
         disposableOwner,
         {
            target: set,
         }
      );

      const expected = setProxyFactory.getFromData({ set })?.proxy;
      observer = observerProxyPair.observer;
      expect(expected).toBeDefined();
      expect(observerProxyPair.proxy).toBe(expected);
   });

   it('create will return Observergroup', async () => {
      const objectSet = new Set([
         { x: 1 },
         { x: 2 }
      ]);
      observer = setObserverProxyPairFactory.create(disposableOwner, {
         target: objectSet,
      }).observer;

      const setProxyId = setProxyFactory.getId({
         set: objectSet,
      }) as Set<unknown>;

      const expected = new ObserverGroup(
         disposableOwner,
         objectSet,
         objectSet,
         truePredicate,
         new ErrorLog(),
         undefined,
         () => setProxyFactory.getFromId(setProxyId)?.observer,
         true
      );

      expect(observer).observerEqualTo(expected);
   });

   it('create will return  an Observergroup with item observers when setting mustProxify', async () => {
      const item1 = { x: 1 };
      const item2 = { x: 2 };
      const objectSet = new Set([
         item1,
         item2
      ]);
      observer = setObserverProxyPairFactory.create(disposableOwner, {
         target: objectSet,
         shouldWatchIndex: truePredicate
      }).observer;

      const objectPropertyObserverProxyPairManager =
         InjectionContainer.get<IObjectPropertyObserverProxyPairManager>(
            RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
         );
      const propertyObserverProxyPairManager =
         objectPropertyObserverProxyPairManager.getFromId(objectSet);

      expect(propertyObserverProxyPairManager).toBeDefined();

      const item1Id = propertyObserverProxyPairManager?.getId({
         key: item1,
         shouldWatchIndex: truePredicate,
      });
      const item2Id = propertyObserverProxyPairManager?.getId({
         key: item2,
         shouldWatchIndex: truePredicate,
      });
      const mapProxyId = setProxyFactory.getId({
         set: objectSet,
      }) as Set<unknown>;

      const expected = new ObserverGroup(
         disposableOwner,
         objectSet,
         objectSet,
         truePredicate,
         new ErrorLog(),
         undefined,
         () => setProxyFactory.getFromId(mapProxyId)?.observer,
         true
      ).addObservers([
         propertyObserverProxyPairManager?.getFromId(item1Id)?.observer as IObserver,
         propertyObserverProxyPairManager?.getFromId(item2Id)?.observer as IObserver,
      ]);
      expect(observer).observerEqualTo(expected);
   });

   it('dispose will release the Set proxy', async () => {
      const objectSet = new Set([
         { x: 1 },
         { x: 2 }
      ]);

      observer = setObserverProxyPairFactory.create(
         disposableOwner,
         { target: objectSet }
      ).observer;

      disposableOwner.canDispose.mockReturnValue(true);

      expect(setProxyFactory.getFromId(objectSet)).toBeDefined();

      observer.dispose();

      expect(setProxyFactory.getFromId(objectSet)).toBeUndefined();
   });

   it('dispose will release the items for recursive observer', async () => {
      const item1 = { x: 1 };
      const item2 = { x: 2 };
      const objectSet = new Set([
         item1,
         item2
      ]);
      const observerProxyPair: ISetObserverProxyPair = setObserverProxyPairFactory.create(
         disposableOwner,
         { target: objectSet, shouldWatchIndex: truePredicate }
      );
      observer = observerProxyPair.observer;
      disposableOwner.canDispose.mockReturnValue(true);

      const objectPropertyObserverProxyPairManager =
         InjectionContainer.get<IObjectPropertyObserverProxyPairManager>(
            RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
         );
      const propertyObserverProxyPairManager =
         objectPropertyObserverProxyPairManager.getFromId(objectSet);
      const item1Id = propertyObserverProxyPairManager?.getId({
         key: item1,
         shouldWatchIndex: truePredicate
      });
      const item2Id = propertyObserverProxyPairManager?.getId({
         key: item2,
         shouldWatchIndex: truePredicate
      });

      expect(setProxyFactory.getFromId(objectSet)).toBeDefined();
      expect(propertyObserverProxyPairManager?.getFromId(item1Id)).toBeDefined();
      expect(propertyObserverProxyPairManager?.getFromId(item2Id)).toBeDefined();
      expect(item1).isWritableProperty('x');
      expect(item2).isWritableProperty('x');

      observer.dispose();

      expect(setProxyFactory.getFromId(objectSet)).toBeUndefined();
      expect(
         propertyObserverProxyPairManager?.getFromId(item1Id)
      ).toBeUndefined();
      expect(
         propertyObserverProxyPairManager?.getFromId(item2Id)
      ).toBeUndefined();
      expect(item1).not.isWritableProperty('x');
      expect(item2).not.isWritableProperty('x');
   });

   it('will only proxify items for which mustProxify returns true', () => {
      const item1 = { x: 1 };
      const item2 = { x: 2 };
      const item3 = { x: 3 };
      const objectSet = new Set([
         item1,
         item2,
         item3
      ]);

      const mustProxify = jest.fn();
      mustProxify.mockImplementation((index: { x: number } | string) => {
         return index === item1 || index === item3 || index === 'x';
      });



      const observerProxyPair: ISetObserverProxyPair = setObserverProxyPairFactory.create(
         disposableOwner,
         { target: objectSet, shouldWatchIndex: mustProxify }
      );
      observer = observerProxyPair.observer;

      expect(mustProxify).toHaveBeenCalledTimes(5);
      expect(mustProxify).toHaveBeenNthCalledWith(1, item1, objectSet);
      expect(mustProxify).toHaveBeenNthCalledWith(2, 'x', item1);
      expect(mustProxify).toHaveBeenNthCalledWith(3, item2, objectSet);
      expect(mustProxify).toHaveBeenNthCalledWith(4, item3, objectSet);
      expect(mustProxify).toHaveBeenNthCalledWith(5, 'x', item3);
      expect(item1).isWritableProperty('x');
      expect(item2).not.isWritableProperty('x');
      expect(item3).isWritableProperty('x');
   });

   describe(`change event for recursive observer for  'Set([{ x: 1 }, { x: 2 }])'`, () => {
      let proxyRegister: IProxyRegistry;

      beforeEach(() => {
         proxyRegister = InjectionContainer.get(RsXStateManagerInjectionTokens.IProxyRegistry);
      });

      it('change event is emitted when adding Set item', async () => {
         const objectSet = new Set([
            { x: 1 },
            { x: 2 }
         ]);
         observer = setObserverProxyPairFactory.create(disposableOwner, {
            target: objectSet,
            shouldWatchIndex: truePredicate
         }).observer;

         const item3 = { x: 3 };
         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            const setProxy = proxyRegister.getProxy<Set<{ x: number }>>(objectSet);
            setProxy.add(item3);
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: objectSet, id: item3 }],
            id: item3,
            newValue: item3,
            target: objectSet,
         };

         expect(actual).toEqual(expected);
      });

      it('change event is emitted when deleting Set item', async () => {
         const item2 = { x: 2 };
         const objectSet = new Set([
            { x: 1 },
            item2
         ]);
         observer = setObserverProxyPairFactory.create(disposableOwner, {
            target: objectSet,
            shouldWatchIndex: truePredicate
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            const mapProxy = proxyRegister.getProxy<Set<{ x: number }>>(objectSet);
            mapProxy.delete(item2);
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: objectSet, id: item2 }],
            id: item2,
            newValue: undefined,
            target: objectSet
         };

         expect(actual).toEqual(expected);
      });

      it('change event is emitted when changing Set item', async () => {
         const item2 = { x: 2 };
         const objectSet = new Set([
            { x: 1 },
            item2
         ]);
         observer = setObserverProxyPairFactory.create(disposableOwner, {
            target: objectSet,
            shouldWatchIndex: truePredicate
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            item2.x = 200;
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [
               { object: objectSet, id: item2 },
               { object: item2, id: 'x' }
            ],
            id: 'x',
            newValue: 200,
            target: item2
         };

         expect(actual).toEqual(expected);
      });
   });

   describe(`change event for non-recursive observer for  'Set([{ x: 1 }, { x: 2 }])'`, () => {
      let proxyRegister: IProxyRegistry;

      beforeEach(() => {
         proxyRegister = InjectionContainer.get(RsXStateManagerInjectionTokens.IProxyRegistry);
      });

      it('change event is emitted when adding Map item', async () => {
         const objectSet = new Set([
            { x: 1 },
            { x: 2 }
         ]);
         observer = setObserverProxyPairFactory.create(disposableOwner, {
            target: objectSet,
         }).observer;

         const item3 = { x: 3 };

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            const mapProxy = proxyRegister.getProxy<Set<{ x: number }>>(objectSet);
            mapProxy.add(item3);
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: objectSet, id: item3 }],
            id: item3,
            newValue: item3,
            target: objectSet
         };

         expect(actual).toEqual(expected);
      });

      it('change event is emitted when deleting Map item', async () => {
         const item2 = { x: 2 };
         const objectSet = new Set([
            { x: 1 },
            item2
         ]);
         observer = setObserverProxyPairFactory.create(disposableOwner, {
            target: objectSet,
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            const setProxy = proxyRegister.getProxy<Set<{ x: number }>>(objectSet);
            setProxy.delete(item2);
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: objectSet, id: item2 }],
            id: item2,
            newValue: undefined,
            target: objectSet
         };

         expect(actual).toEqual(expected);
      });
      it('change event is not emitted when changing array item', async () => {
         const item2 = { x: 2 };
         const objectSet = new Set([
            { x: 1 },
            item2
         ]);
         observer = setObserverProxyPairFactory.create(disposableOwner, {
            target: objectSet,
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            item2.x = 200;
         });

         expect(actual).toBeNull();
      });
   });
});
