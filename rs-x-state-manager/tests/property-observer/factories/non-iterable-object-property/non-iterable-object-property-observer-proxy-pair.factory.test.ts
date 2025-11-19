import {
   InjectionContainer,
   IPropertyChange,
   truePredicate,
   WaitForEvent,
} from '@rs-x/core';
import { of } from 'rxjs';
import { IObserver } from '../../../../lib/observer.interface';
import { IIndexObserverProxyPairFactory } from '../../../../lib/property-observer/index-observer-proxy-pair.factory.interface';
import { IArrayProxyFactory } from '../../../../lib/proxies/array-proxy/array-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../../../lib/rs-x-state-manager-injection-tokes';
import { RsXStateManagerModule } from '../../../../lib/rs-x-state-manager.module';
import { DisposableOwnerMock } from '../../../../lib/testing/disposable-owner.mock';

describe('non iterableObjectPropertyObserverFactory', () => {
   let disposableOwner: DisposableOwnerMock;
   let observer: IObserver;
   let recursiveObserver: IObserver;
   let nonRecursiveObserver: IObserver;
   let arrayProxyFactory: IArrayProxyFactory;
   let nonIterableObjectPropertyObserverFactory: IIndexObserverProxyPairFactory;

   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);
      nonIterableObjectPropertyObserverFactory =
         InjectionContainer.get<IIndexObserverProxyPairFactory>(
            RsXStateManagerInjectionTokens.NonIterableObjectPropertyObserverProxyPairFactory
         );
      arrayProxyFactory = InjectionContainer.get<IArrayProxyFactory>(
         RsXStateManagerInjectionTokens.IArrayProxyFactory
      );
   });

   afterAll(async () => {
      await InjectionContainer.unload(RsXStateManagerModule);
   });

   beforeEach(() => {
      disposableOwner = new DisposableOwnerMock();
   });

   afterEach(() => {
      observer?.dispose();
      recursiveObserver?.dispose();
      nonRecursiveObserver?.dispose();
      observer = null;
      recursiveObserver = null;
      nonRecursiveObserver = null;
   });

   it('applies return true if object is not iterable', () => {
      const actual = nonIterableObjectPropertyObserverFactory.applies(
         {},
         { key: 'x' }
      );
      expect(actual).toEqual(true);
   });

   it('applies return false if object is array', () => {
      const actual = nonIterableObjectPropertyObserverFactory.applies([], {
         key: 'x',
      });
      expect(actual).toEqual(false);
   });

   it('applies return false if object is Map', () => {
      const actual = nonIterableObjectPropertyObserverFactory.applies(
         new Map(),
         { key: 'x' }
      );
      expect(actual).toEqual(false);
   });

   it('applies return false if object is Set', () => {
      const actual = nonIterableObjectPropertyObserverFactory.applies(
         new Set(),
         { key: 'x' }
      );
      expect(actual).toEqual(false);
   });

   it('create will return no proxy for value type', () => {
      const object = { x: 300 };
      const actual = nonIterableObjectPropertyObserverFactory.create(
         disposableOwner,
         object,
         { key: 'x', mustProxify: truePredicate }
      ).proxy;

      expect(actual).toBeUndefined();
   });

   it('create will return proxy for property value for recursive observer if proxy is creayed', () => {
      const array = [];
      const object = { x: array };
      const actual = nonIterableObjectPropertyObserverFactory.create(
         disposableOwner,
         object,
         { key: 'x', mustProxify: truePredicate }
      ).proxy;

      const expected = arrayProxyFactory.getFromData({
         array,
         mustProxify: truePredicate,
      }).proxy;
      expect(actual).toBe(expected);
   });

   it('create will return no proxy for property value for non-recursive observer', () => {
      const array = [];
      const object = { x: array };
      const actual = nonIterableObjectPropertyObserverFactory.create(
         disposableOwner,
         object,
         { key: 'x' }
      ).proxy;

      expect(actual).toBeUndefined();
   });

   it('create will replace property with proxy for recursive observer', () => {
      const array = [];
      const object = { x: array };

      nonIterableObjectPropertyObserverFactory.create(disposableOwner, object, {
         key: 'x',
         mustProxify: truePredicate,
      });

      const expected = arrayProxyFactory.getFromData({
         array,
         mustProxify: truePredicate,
      }).proxy;
      expect(object.x).toBe(expected);
   });

   it('old proxy will be replaced if we set property to new value', () => {
      const array = [];
      const object = { x: array };

      nonIterableObjectPropertyObserverFactory.create(disposableOwner, object, {
         key: 'x',
         mustProxify: truePredicate,
      });

      const newArray = [1];
      object.x = newArray;

      const expected = arrayProxyFactory.getFromData({
         array: newArray,
         mustProxify: truePredicate,
      }).proxy;
      expect(object.x).toBe(expected);
   });

   it('old proxy will be dispose if we set property to new value', () => {
      const oldArray = [];
      const object = { x: oldArray };

      nonIterableObjectPropertyObserverFactory.create(disposableOwner, object, {
         key: 'x',
         mustProxify: truePredicate,
      });

      expect(
         arrayProxyFactory.getFromData({
            array: oldArray,
            mustProxify: truePredicate,
         })
      ).toBeDefined();

      const newArray = [1];
      object.x = newArray;

      expect(
         arrayProxyFactory.getFromData({
            array: oldArray,
            mustProxify: truePredicate,
         })
      ).toBeUndefined();

      expect(
         arrayProxyFactory.getFromData({
            array: newArray,
            mustProxify: truePredicate,
         })
      ).toBeDefined();
      expect(object.x).toBe(
         arrayProxyFactory.getFromData({
            array: newArray,
            mustProxify: truePredicate,
         }).proxy
      );
   });

   it('if we set set property to a new Promise it will be observed ', async () => {
      const object = { x: Promise.resolve(10) };
      observer = nonIterableObjectPropertyObserverFactory.create(
         disposableOwner,
         object,
         { key: 'x', mustProxify: truePredicate }
      ).observer;

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         object.x = Promise.resolve(20);
      });

      const expected: IPropertyChange = {
         arguments: [],
         chain: [{ object, id: 'x' }],
         newValue: 20,
         target: object.x,
      };

      expect(actual).toEqual(expected);
   });

   it('if we set set property to a new Observable it will be observed ', async () => {
      const object = { x: of(10) };
      observer = nonIterableObjectPropertyObserverFactory.create(
         disposableOwner,
         object,
         { key: 'x', mustProxify: truePredicate }
      ).observer;

      const actual = await new WaitForEvent(observer, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         object.x = of(20);
      });

      const expected: IPropertyChange = {
         arguments: [],
         chain: [{ object, id: 'x' }],
         newValue: 20,
         target: object.x,
      };

      expect(actual).toEqual(expected);
   });

   it('if we set set property to new value it will be observed for recursive observer', async () => {
      const object = { x: [] };
      observer = nonIterableObjectPropertyObserverFactory.create(
         disposableOwner,
         object,
         { key: 'x', mustProxify: truePredicate }
      ).observer;
      object.x = [1, 2, 3];

      const actual = await new WaitForEvent(observer, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         object.x.push(4);
      });

      const expected: IPropertyChange = {
         arguments: [],
         chain: [
            { object, id: 'x' },
            { object: object.x, id: 3 },
         ],
         id: 3,
         newValue: 4,
         target: object.x,
         isNew: true,
      };

      expect(actual).toEqual(expected);
   });

   it('change event will emit if we change property value for recursive observer', async () => {
      const object = { x: [] };
      observer = nonIterableObjectPropertyObserverFactory.create(
         disposableOwner,
         object,
         { key: 'x', mustProxify: truePredicate }
      ).observer;

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         object.x.push(1);
      });

      const expected: IPropertyChange = {
         arguments: [],
         chain: [
            { object, id: 'x' },
            { object: object.x, id: 0 },
         ],
         id: 0,
         newValue: 1,
         target: object.x,
         isNew: true,
      };

      expect(actual).toEqual(expected);
   });

   it('change event will not emit if we change property value for non-recursive observer', async () => {
      const object = { x: [] };
      observer = nonIterableObjectPropertyObserverFactory.create(
         disposableOwner,
         object,
         { key: 'x' }
      ).observer;

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         object.x.push(1);
      });

      expect(actual).toBeNull();
   });

   it('can create recursive and  non-recursive observer without conflicts: changing index value', async () => {
      const object = { x: [] };
      recursiveObserver = nonIterableObjectPropertyObserverFactory.create(
         disposableOwner,
         object,
         { key: 'x', mustProxify: truePredicate }
      ).observer;
      nonRecursiveObserver = nonIterableObjectPropertyObserverFactory.create(
         disposableOwner,
         object,
         { key: 'x' }
      ).observer;

      let actual = await new WaitForEvent(recursiveObserver, 'changed').wait(
         () => {
            object.x.push(1);
         }
      );

      expect(actual).not.toBeNull();

      actual = await new WaitForEvent(nonRecursiveObserver, 'changed').wait(
         () => {
            object.x.push(12);
         }
      );

      expect(actual).toBeNull();
   });

   it('can create recursive and non-recursive observer without conflicts: setting index value', async () => {
      const object = { x: [] };
      recursiveObserver = nonIterableObjectPropertyObserverFactory.create(
         disposableOwner,
         object,
         { key: 'x', mustProxify: truePredicate }
      ).observer;
      nonRecursiveObserver = nonIterableObjectPropertyObserverFactory.create(
         disposableOwner,
         object,
         { key: 'x' }
      ).observer;

      let actual = await new WaitForEvent(recursiveObserver, 'changed').wait(
         () => {
            object.x = [1];
         }
      );

      let expected: IPropertyChange = {
         arguments: [],
         chain: [{ object, id: 'x' }],
         hasRebindNested: true,
         id: 'x',
         newValue: [1],
         target: object,
      };
      expect(actual).toEqual(expected);

      actual = await new WaitForEvent(nonRecursiveObserver, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         object.x = [2];
      });

      expected = {
         arguments: [],
         chain: [{ object, id: 'x' }],
         id: 'x',
         hasRebindNested: false,
         newValue: [2],
         target: object,
      };
      expect(actual).toEqual(expected);
   });

   it('can create recursive and non-recursive observer without conflicts: changing nested value', async () => {
      const object = { x: [] };
      recursiveObserver = nonIterableObjectPropertyObserverFactory.create(
         disposableOwner,
         object,
         { key: 'x', mustProxify: truePredicate }
      ).observer;
      nonRecursiveObserver = nonIterableObjectPropertyObserverFactory.create(
         disposableOwner,
         object,
         { key: 'x' }
      ).observer;

      let actual = await new WaitForEvent(recursiveObserver, 'changed').wait(
         () => {
            object.x.push(1);
         }
      );

      const expected: IPropertyChange = {
         arguments: [],
         chain: [
            { object, id: 'x' },
            { object: object.x, id: 0 },
         ],
         id: 0,
         newValue: 1,
         target: object.x,
         isNew: true,
      };

      expect(actual).toEqual(expected);

      actual = await new WaitForEvent(nonRecursiveObserver, 'changed').wait(
         () => {
            object.x.push(2);
         }
      );

      expect(actual).toBeNull();
   });
});
