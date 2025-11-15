import { InjectionContainer, IPropertyChange, WaitForEvent } from '@rs-x/core';
import { IObjectObserverProxyPairFactory } from '../../../lib/object-observer/object-observer-proxy-pair.factory.interface';
import { IObserver } from '../../../lib/observer.interface';
import { RsXStateManagerInjectionTokens } from '../../../lib/rs-x-state-manager-injection-tokes';
import { RsXStateManagerModule } from '../../../lib/rs-x-state-manager.module';
import { DisposableOwnerMock } from '../../../lib/testing';

interface ITestObject {
   a?: number;
   array?: number[];
   nested?: ITestObject;
}

describe('PlainObjectObserverProxyPairFactory tests', () => {
   let disposableOwner: DisposableOwnerMock;
   let observer: IObserver;
   let plainObjectObserverFactory: IObjectObserverProxyPairFactory;

   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);

      plainObjectObserverFactory =
         InjectionContainer.get<IObjectObserverProxyPairFactory>(
            RsXStateManagerInjectionTokens.PlainObjectObserverProxyPairFactory
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

   it('applies will return true when passed in value is plain object', async () => {
      const actual = plainObjectObserverFactory.applies({});
      expect(actual).toEqual(true);
   });

   it('applies will return false when passed in value is not plain object', async () => {
      const actual = plainObjectObserverFactory.applies(new Date());
      expect(actual).toEqual(false);
   });

   it('create will return patched object as proxy', async () => {
      const object: ITestObject = {
         a: 10,
      };
      const observerProxyPair = plainObjectObserverFactory.create(
         disposableOwner,
         {
            target: object,
         }
      );
      observer = observerProxyPair.observer;
      expect(observerProxyPair.proxy).toEqual(object);
   });

   it('will patch value type properties', async () => {
      const object: ITestObject = {
         a: 10,
      };
      observer = plainObjectObserverFactory.create(disposableOwner, {
         target: object,
      }).observer;

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         object.a = 20;
      });

      const expected: IPropertyChange = {
         arguments: [],
         chain: [{ object, id: 'a' }],
         id: 'a',
         hasRebindNested: false,
         newValue: 20,
         target: object,
      };
      expect(actual).toEqual(expected);
   });

   it('will observer property values if we set recursive to true', async () => {
      const object: ITestObject = {
         array: [1, 2, 3],
      };

      observer = plainObjectObserverFactory.create(disposableOwner, {
         target: object,
         mustProxify: (propertyName: string) => propertyName === 'array',
      }).observer;

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         object.array.push(4);
      });

      const expected: IPropertyChange = {
         arguments: [],
         chain: [
            { object, id: 'array' },
            { object: object.array, id: 3 },
         ],
         id: 3,
         newValue: 4,
         target: object.array,
         isNew: true,
      };

      expect(actual).toEqual(expected);
   });

   it('will not observer property values if we do not pass a mustProxify function', async () => {
      const object: ITestObject = {
         array: [1, 2, 3],
      };
      observer = plainObjectObserverFactory.create(disposableOwner, {
         target: object,
      }).observer;

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         object.array.push(4);
      });

      expect(actual).toBeNull();
   });

   it('will  observer matching array elements if the passed in mustProxify function return true', async () => {
      const object = {
         array: [{ x: 1 }, { x: 2 }],
      };
      observer = plainObjectObserverFactory.create(disposableOwner, {
         target: object,
         mustProxify: (index) => index === 1,
      }).observer;

      let actual = await new WaitForEvent(observer, 'changed').wait(() => {
         object.array[1].x = 2000;
      });

      const expected: IPropertyChange = {
         arguments: [],
         chain: [
            { object, id: 'array' },
            { object: object.array, id: 1 },
            { object: object.array[1], id: 'x' },
         ],
         target: object.array[1],
         id: 'x',
         hasRebindNested: false,
         newValue: 2000,
      };
      expect(actual).toEqual(expected);

      actual = await new WaitForEvent(observer, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         object.array[0].x = 10000;
      });
      expect(actual).toBeNull();
   });

   it('will not patch nested object properties', async () => {
      const object: ITestObject = {
         nested: {
            array: [1, 2, 3],
         },
      };

      observer = plainObjectObserverFactory.create(disposableOwner, {
         target: object,
      }).observer;

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         object.nested.array.push(4);
      });

      expect(actual).toBeNull();
   });
});
