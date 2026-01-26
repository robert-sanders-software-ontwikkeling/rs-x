import {
   ErrorLog,
   InjectionContainer,
   type IPropertyChange,
   truePredicate,
   WaitForEvent,
} from '@rs-x/core';
import { DisposableOwnerMock } from '@rs-x/core/testing';
import { type IArrayObserverProxyPairFactory } from '../../../lib/object-observer/factories/array-observer-proxy-pair.factory.type';
import { type IObjectPropertyObserverProxyPairManager } from '../../../lib/object-property-observer-proxy-pair-manager.type';
import { ObserverGroup } from '../../../lib/observer-group';
import { type IObserver } from '../../../lib/observer.interface';
import { type IArrayObserverProxyPair, type IArrayProxyFactory } from '../../../lib/proxies/array-proxy/array-proxy.factory.type';
import { type IProxyRegistry } from '../../../lib/proxies/proxy-registry/proxy-registry.interface';
import { RsXStateManagerInjectionTokens } from '../../../lib/rs-x-state-manager-injection-tokes';
import { RsXStateManagerModule } from '../../../lib/rs-x-state-manager.module';



describe('ArrayObserverProxyPairFactory tests', () => {
   let arrayObserverProxyPairFactory: IArrayObserverProxyPairFactory;
   let arrayProxyFactory: IArrayProxyFactory;
   let disposableOwner: DisposableOwnerMock;
   let observer: IObserver | undefined;

   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);
      arrayProxyFactory = InjectionContainer.get<IArrayProxyFactory>(
         RsXStateManagerInjectionTokens.IArrayProxyFactory
      );

      arrayObserverProxyPairFactory =
         InjectionContainer.get<IArrayObserverProxyPairFactory>(
            RsXStateManagerInjectionTokens.IArrayObserverProxyPairFactory
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

   it('applies will return true when passed in value is array', async () => {
      const actual = arrayObserverProxyPairFactory.applies([]);
      expect(actual).toEqual(true);
   });

   it('applies will return false when passed in value is not array', async () => {
      const actual = arrayObserverProxyPairFactory.applies({});
      expect(actual).toEqual(false);
   });

   it('create will create a array proxy', async () => {
      const array = [];
      const observerProxyPair = arrayObserverProxyPairFactory.create(
         disposableOwner,
         {
            target: array,
         }
      );

      const expected = arrayProxyFactory.getFromData({ array })?.proxy;
      observer = observerProxyPair.observer;
      expect(expected).toBeDefined();
      expect(observerProxyPair.proxy).toBe(expected);
   });

   it('create will return  Observergroup', async () => {
      const objectArray = [{ x: 1 }, { x: 2 }];
      observer = arrayObserverProxyPairFactory.create(disposableOwner, {
         target: objectArray,
      }).observer;

      const arrayProxyId = arrayProxyFactory.getId({
         array: objectArray,
      });

      const expected = new ObserverGroup(
         disposableOwner,
         objectArray,
         objectArray,
         truePredicate,
         new ErrorLog(),
         undefined,
         () => {
            const proxy = arrayProxyFactory?.getFromId(arrayProxyId);
            return (proxy ? (proxy.observer as IObserver) : undefined) as IObserver;
         },
         true
      );

      expect(observer).observerEqualTo(expected);
   });

   it('create will return  an Observergroup with item observers when setting mustProxify', async () => {
      const objectArray = [{ x: 1 }, { x: 2 }];
      observer = arrayObserverProxyPairFactory.create(disposableOwner, {
         target: objectArray,
         mustProxify: truePredicate
      }).observer;

      const objectPropertyObserverProxyPairManager =
         InjectionContainer.get<IObjectPropertyObserverProxyPairManager>(
            RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
         );
      const propertyObserverProxyPairManager =
         objectPropertyObserverProxyPairManager.getFromId(objectArray);

      expect(propertyObserverProxyPairManager).toBeDefined();

      const item1Id = propertyObserverProxyPairManager?.getId({
         key: 0,
         mustProxify: truePredicate,
      });
      const item2Id = propertyObserverProxyPairManager?.getId({
         key: 1,
         mustProxify: truePredicate,
      });
      const arrayProxyId = arrayProxyFactory.getId({
         array: objectArray,
      }) as unknown

      expect(arrayProxyId).toBeDefined()

      const expected = new ObserverGroup(
         disposableOwner,
         objectArray,
         objectArray,
         truePredicate,
         new ErrorLog(),
         undefined,
         () => {
            const proxy = arrayProxyFactory?.getFromId(arrayProxyId);
            return (proxy ? (proxy.observer as IObserver) : undefined) as IObserver;
         },
         true
      ).addObservers([
         propertyObserverProxyPairManager?.getFromId(item1Id)?.observer as IObserver,    
         propertyObserverProxyPairManager?.getFromId(item2Id)?.observer as IObserver,
      ]);
      expect(observer).observerEqualTo(expected);
   });

   it('dispose will release the array proxy', async () => {
      const objectArray = [{ x: 1 }, { x: 2 }];

      observer = arrayObserverProxyPairFactory.create(
         disposableOwner,
         { target: objectArray }
      ).observer;

      disposableOwner.canDispose.mockReturnValue(true);

      expect(arrayProxyFactory.getFromId(objectArray)).toBeDefined();

      observer.dispose();

      expect(arrayProxyFactory.getFromId(objectArray)).toBeUndefined();
   });

   it('dispose will release the items for recursive observer', async () => {
      const objectArray = [{ x: 1 }, { x: 2 }];
      const observerProxyPair: IArrayObserverProxyPair = arrayObserverProxyPairFactory.create(
         disposableOwner,
         { target: objectArray, mustProxify: truePredicate }
      );
      observer = observerProxyPair.observer;
      disposableOwner.canDispose.mockReturnValue(true);

      const objectPropertyObserverProxyPairManager =
         InjectionContainer.get<IObjectPropertyObserverProxyPairManager>(
            RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
         );
      const propertyObserverProxyPairManager =
         objectPropertyObserverProxyPairManager.getFromId(objectArray);
      const item1Id = propertyObserverProxyPairManager?.getId({
         key: 0,
         mustProxify: truePredicate
      });
      const item2Id = propertyObserverProxyPairManager?.getId({
         key: 1,
         mustProxify: truePredicate
      });

      expect(arrayProxyFactory.getFromId(objectArray)).toBeDefined();
      expect(propertyObserverProxyPairManager?.getFromId(item1Id)).toBeDefined();
      expect(propertyObserverProxyPairManager?.getFromId(item2Id)).toBeDefined();
      expect(objectArray[0]).isWritableProperty('x');
      expect(objectArray[1]).isWritableProperty('x')

      observer.dispose();

      expect(arrayProxyFactory.getFromId(objectArray)).toBeUndefined();
      expect(
         propertyObserverProxyPairManager?.getFromId(item1Id)
      ).toBeUndefined();
      expect(
         propertyObserverProxyPairManager?.getFromId(item2Id)
      ).toBeUndefined();
      expect(objectArray[0]).not.isWritableProperty('x');
      expect(objectArray[1]).not.isWritableProperty('x')
   });

   it('will only proxify items for which mustProxify returns true', () => {
      const objectArray = [{ x: 1 }, { x: 2 }, { x: 3 }];

      const mustProxify = jest.fn();
      mustProxify.mockImplementation((index: number|string) => index === 0 || index === 2 || index === 'x');

      const observerProxyPair: IArrayObserverProxyPair = arrayObserverProxyPairFactory.create(
         disposableOwner,
         { target: objectArray, mustProxify }
      );
      observer = observerProxyPair.observer;

      expect(mustProxify).toHaveBeenCalledTimes(5);
      expect(mustProxify).toHaveBeenNthCalledWith(1, 0, objectArray);
      expect(mustProxify).toHaveBeenNthCalledWith(2, 'x', objectArray[0]);
      expect(mustProxify).toHaveBeenNthCalledWith(3, 1, objectArray);
      expect(mustProxify).toHaveBeenNthCalledWith(4, 2, objectArray);
      expect(mustProxify).toHaveBeenNthCalledWith(5, 'x', objectArray[2]);
      expect(objectArray[0]).isWritableProperty('x');
      expect(objectArray[1]).not.isWritableProperty('x');
      expect(objectArray[2]).isWritableProperty('x');
   });

   describe(`change event for recursive observer for  '[{ x: 1 }, { x: 2 }]'`, () => {
      let proxyRegister: IProxyRegistry;

      beforeEach(() => {
         proxyRegister = InjectionContainer.get(RsXStateManagerInjectionTokens.IProxyRegistry);
      })

      it('change event is emitted when adding array item', async () => {
         const array = [{ x: 1 }, { x: 2 }];
         observer = arrayObserverProxyPairFactory.create(disposableOwner, {
            target: array,
            mustProxify: truePredicate
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            const arrayProxy = proxyRegister.getProxy<({ x: number })[]>(array)
            arrayProxy.push({ x: 3 });;
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: array, id: 2 }],
            id: 2,
            newValue: { x: 3 },
            target: array
         };

         expect(actual).toEqual(expected);
      });

      it('change event is emitted when deleting array item', async () => {
         const array = [{ x: 1 }, { x: 2 }];
         observer = arrayObserverProxyPairFactory.create(disposableOwner, {
            target: array,
            mustProxify: truePredicate
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            const arrayProxy = proxyRegister.getProxy<({ x: number })[]>(array)
            arrayProxy.splice(1, 1);
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: array, id: 1 }],
            id: 1,
            newValue: undefined,
            target: array
         };

         expect(actual).toEqual(expected);
      });

      it('change event is emitted when changing array item', async () => {
         const array = [{ x: 1 }, { x: 2 }];
         observer = arrayObserverProxyPairFactory.create(disposableOwner, {
            target: array,
            mustProxify: truePredicate
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            array[1].x = 200
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [
               { object: array, id: 1 },
               { object: array[1], id: 'x' }
            ],
            id: 'x',
            newValue: 200,
            target: array[1]
         };

         expect(actual).toEqual(expected);
      });
   });

   describe(`change event for non-recursive observer for  '[{ x: 1 }, { x: 2 }]'`, () => {
      let proxyRegister: IProxyRegistry;

      beforeEach(() => {
         proxyRegister = InjectionContainer.get(RsXStateManagerInjectionTokens.IProxyRegistry);
      })

      it('change event is emitted when adding array item', async () => {
         const array = [{ x: 1 }, { x: 2 }];
         observer = arrayObserverProxyPairFactory.create(disposableOwner, {
            target: array,
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            const arrayProxy = proxyRegister.getProxy<({ x: number })[]>(array)
            arrayProxy.push({ x: 3 });;
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: array, id: 2 }],
            id: 2,
            newValue: { x: 3 },
            target: array
         };

         expect(actual).toEqual(expected);
      });

      it('change event is emitted when deleting array item', async () => {
         const array = [{ x: 1 }, { x: 2 }];
         observer = arrayObserverProxyPairFactory.create(disposableOwner, {
            target: array,
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            const arrayProxy = proxyRegister.getProxy<({ x: number })[]>(array)
            arrayProxy.splice(1, 1);
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: array, id: 1 }],
            id: 1,
            newValue: undefined,
            target: array
         };

         expect(actual).toEqual(expected);
      });

      it('change event is not emitted when changing array item', async () => {
         const array = [{ x: 1 }, { x: 2 }];
         observer = arrayObserverProxyPairFactory.create(disposableOwner, {
            target: array,
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            array[1].x = 200
         });

         expect(actual).toBeNull();
      });
   });
});
