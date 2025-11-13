import {
   ErrorLog,
   InjectionContainer,
   IPropertyChange,
   truePredicate,
   WaitForEvent,
} from '@rs-x/core';
import { IArrayObserverProxyPairFactory } from '../../../lib/object-observer/factories/array-observer-proxy-pair.factory.type';
import { IObjectPropertyObserverProxyPairManager } from '../../../lib/object-property-observer-proxy-pair-manager.type';
import { ObserverGroup } from '../../../lib/observer-group';
import { IObserver } from '../../../lib/observer.interface';
import { IArrayProxyFactory } from '../../../lib/proxies/array-proxy/array-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../../lib/rs-x-state-manager-injection-tokes';
import { RsXStateManagerModule } from '../../../lib/rs-x-state-manager.module';
import { DisposableOwnerMock } from '../../../lib/testing';
import { IMustProxifyItemHandlerFactory } from '../../../lib/property-observer/must-proxify-item-handler.factory.type';

describe('ArrayObserverProxyPairFactory tests', () => {
   let arrayObserverProxyPairFactory: IArrayObserverProxyPairFactory;
   let arrayProxyFactory: IArrayProxyFactory;
   let disposableOwner: DisposableOwnerMock;
   let observer: IObserver;

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
         observer = null;
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

   it('create will create a map proxy', async () => {
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

   it('create will return  Observergroup without item observers wwithout setting mustProxify', async () => {
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
         () => arrayProxyFactory.getFromId(arrayProxyId).observer,
         true
      );

      expect(observer).observerEqualTo(expected);
   });

   it('create will return  an Observergroup with item observers when setting mustProxify', async () => {
      const mustProxifyHandlerFactory =
         InjectionContainer.get<IMustProxifyItemHandlerFactory>(
            RsXStateManagerInjectionTokens.IMustProxifyItemHandlerFactory
         );
      const objectArray = [{ x: 1 }, { x: 2 }];
      observer = arrayObserverProxyPairFactory.create(disposableOwner, {
         target: objectArray,
         mustProxify: truePredicate,
      }).observer;

      const objectPropertyObserverProxyPairManager =
         InjectionContainer.get<IObjectPropertyObserverProxyPairManager>(
            RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
         );
      const propertyObserverProxyPairManager =
         objectPropertyObserverProxyPairManager.getFromId(objectArray);

      expect(propertyObserverProxyPairManager).toBeDefined();

      const item1Id = propertyObserverProxyPairManager.getId({
         key: 0,
         mustProxify: mustProxifyHandlerFactory.getFromId(0),
      });
      const item2Id = propertyObserverProxyPairManager.getId({
         key: 1,
         mustProxify: mustProxifyHandlerFactory.getFromId(1),
      });
      const arrayProxyId = arrayProxyFactory.getId({
         array: objectArray,
         mustProxify: truePredicate,
      });

      const expected = new ObserverGroup(
         disposableOwner,
         objectArray,
         objectArray,
         truePredicate,
         new ErrorLog(),
         undefined,
         () => arrayProxyFactory.getFromId(arrayProxyId).observer,
         true
      ).addObservers([
         propertyObserverProxyPairManager.getFromId(item1Id).observer,
         propertyObserverProxyPairManager.getFromId(item2Id).observer,
      ]);
      expect(observer).observerEqualTo(expected);
   });

   it('change array will emit change event', async () => {
      const numberArray = [1, 2, 3, 4];
      observer = arrayObserverProxyPairFactory.create(disposableOwner, {
         target: numberArray,
      }).observer;
      const arrayProxyId = arrayProxyFactory.getId({
         array: numberArray,
      });
      const arrayProxy = arrayProxyFactory.getFromId(arrayProxyId)
         .proxy as number[];

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         arrayProxy.push(5);
      });

      const expected: IPropertyChange = {
         arguments: [],
         chain: [{ object: observer.target, id: 4 }],
         id: 4,
         newValue: 5,
         target: observer.target,
         isNew: true,
      };

      expect(actual).toEqual(expected);
   });

   it('items will not be observed when mustProxify is not set', () => {
      const objectArray = [{ x: 1 }, { x: 2 }];

      const observerProxyPair = arrayObserverProxyPairFactory.create(
         disposableOwner,
         { target: objectArray }
      );
      observer = observerProxyPair.observer;
      disposableOwner.canDispose.mockReturnValue(true);
      const objectPropertyObserverProxyPairManager =
         InjectionContainer.get<IObjectPropertyObserverProxyPairManager>(
            RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
         );

      const propertyObserverProxyPairManager =
         objectPropertyObserverProxyPairManager.getFromId(objectArray);

      expect(arrayProxyFactory.getFromId(observerProxyPair.id)).toBeDefined();
      expect(propertyObserverProxyPairManager).toBeUndefined();
   });

   it('dispose will release the array', async () => {
      const objectArray = [{ x: 1 }, { x: 2 }];

      const observerProxyPair = arrayObserverProxyPairFactory.create(
         disposableOwner,
         { target: objectArray }
      );
      observer = observerProxyPair.observer;
      disposableOwner.canDispose.mockReturnValue(true);

      expect(arrayProxyFactory.getFromId(observerProxyPair.id)).toBeDefined();

      observer.dispose();

      expect(arrayProxyFactory.getFromId(observerProxyPair.id)).toBeUndefined();
   });

   it('dispose will release the item for recurive observer', async () => {
      const mustProxifyHandlerFactory =
         InjectionContainer.get<IMustProxifyItemHandlerFactory>(
            RsXStateManagerInjectionTokens.IMustProxifyItemHandlerFactory
         );
      const objectArray = [{ x: 1 }, { x: 2 }];

      const observerProxyPair = arrayObserverProxyPairFactory.create(
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
      const item1Id = propertyObserverProxyPairManager.getId({
         key: 0,
         mustProxify: mustProxifyHandlerFactory.getFromId(0),
      });
      const item2Id = propertyObserverProxyPairManager.getId({
         key: 1,
         mustProxify: mustProxifyHandlerFactory.getFromId(1),
      });

      expect(arrayProxyFactory.getFromId(observerProxyPair.id)).toBeDefined();
      expect(propertyObserverProxyPairManager.getFromId(item1Id)).toBeDefined();
      expect(propertyObserverProxyPairManager.getFromId(item2Id)).toBeDefined();

      observer.dispose();

      expect(arrayProxyFactory.getFromId(observerProxyPair.id)).toBeUndefined();
      expect(
         propertyObserverProxyPairManager.getFromId(item1Id)
      ).toBeUndefined();
      expect(
         propertyObserverProxyPairManager.getFromId(item2Id)
      ).toBeUndefined();
   });
});
