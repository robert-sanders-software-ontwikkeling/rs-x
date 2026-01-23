import { ErrorLog, InjectionContainer, type IPropertyChange, truePredicate, WaitForEvent } from '@rs-x/core';
import { DisposableOwnerMock } from '@rs-x/core/testing';
import { type IPlainObjectObserverProxyPairFactory } from '../../../lib/object-observer/factories/plain-object-observer-proxy-pair.factory.type';
import { type IObjectPropertyObserverProxyPairManager, type IObserverProxyPair } from '../../../lib/object-property-observer-proxy-pair-manager.type';
import { ObserverGroup } from '../../../lib/observer-group';
import { type IObserver } from '../../../lib/observer.interface';
import { RsXStateManagerInjectionTokens } from '../../../lib/rs-x-state-manager-injection-tokes';
import { RsXStateManagerModule } from '../../../lib/rs-x-state-manager.module';

describe('PlainIbjectObserverProxyPairFactory tests', () => {
   let plainObjectObserverProxyPairFactory: IPlainObjectObserverProxyPairFactory;
   let disposableOwner: DisposableOwnerMock;
   let observer: IObserver;

   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);

      plainObjectObserverProxyPairFactory =
         InjectionContainer.get<IPlainObjectObserverProxyPairFactory>(
            RsXStateManagerInjectionTokens.IPlainObjectObserverProxyPairFactory
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

   it('applies will return true when passed in value is Map', async () => {
      const actual = plainObjectObserverProxyPairFactory.applies({});
      expect(actual).toEqual(true);
   });

   it('applies will return false when passed in value is not Map', async () => {
      const actual = plainObjectObserverProxyPairFactory.applies(new Map());
      expect(actual).toEqual(false);
   });

   it('create will return Observergroup', async () => {
      const plainObject = {
         x: 1,
         nested: {
            y: 2
         }
      };
      observer = plainObjectObserverProxyPairFactory.create(disposableOwner, {
         target: plainObject,
      }).observer;

      const objectPropertyObserverProxyPairManager =
         InjectionContainer.get<IObjectPropertyObserverProxyPairManager>(
            RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
         );
      const propertyObserverProxyPairManager =
         objectPropertyObserverProxyPairManager.getFromId(plainObject);

      const xId = propertyObserverProxyPairManager.getId({
         key: 'x',
      });
      const nestedId = propertyObserverProxyPairManager.getId({
         key: 'nested',
      });

      const rootObserver = new ObserverGroup(
         undefined,
         plainObject,
         plainObject,
         truePredicate,
         new ErrorLog(),
      ).addObservers([
         propertyObserverProxyPairManager.getFromId(xId).observer,
         propertyObserverProxyPairManager.getFromId(nestedId).observer,

      ]);

      const expected = new ObserverGroup(
         disposableOwner,
         plainObject,
         plainObject,
         truePredicate,
         new ErrorLog(),
         undefined,
         () => rootObserver,
      );

      expect(observer).observerEqualTo(expected);
   });

   it('create will return  an Observergroup with item observers when setting mustProxify', async () => {
      const plainObject = {
         x: 1,
         nested: {
            y: 2
         },
         z: 200
      };

      const mustProxify = (index) => index !== 'z';
      observer = plainObjectObserverProxyPairFactory.create(disposableOwner, {
         target: plainObject,
         mustProxify,
      }).observer;

      const objectPropertyObserverProxyPairManager =
         InjectionContainer.get<IObjectPropertyObserverProxyPairManager>(
            RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
         );
      const propertyObserverProxyPairManager =
         objectPropertyObserverProxyPairManager.getFromId(plainObject);

      const nestedPropertyObserverProxyPairManager =
         objectPropertyObserverProxyPairManager.getFromId(plainObject.nested);

      expect(propertyObserverProxyPairManager).toBeDefined();
      expect(nestedPropertyObserverProxyPairManager).toBeDefined();

      const xId = propertyObserverProxyPairManager.getId({
         key: 'x',
         mustProxify,
      });
      const nestedId = propertyObserverProxyPairManager.getId({
         key: 'nested',
         mustProxify,
      });


      const yId = nestedPropertyObserverProxyPairManager.getId({
         key: 'y',
         mustProxify,
      });


      const expected = new ObserverGroup(
         disposableOwner,
         plainObject,
         plainObject,
         truePredicate,
         new ErrorLog(),
      ).addObservers([
         propertyObserverProxyPairManager.getFromId(xId).observer,
         propertyObserverProxyPairManager.getFromId(nestedId).observer,
         new ObserverGroup(
            disposableOwner,
            plainObject.nested,
            plainObject.nested,
            truePredicate,
            new ErrorLog(),
         ).addObservers([nestedPropertyObserverProxyPairManager.getFromId(yId).observer])

      ]);
      expect(observer).observerEqualTo(expected);
   });

   it('dispose will release the items for recursive observer', async () => {
      const plainObject = {
         x: 1,
         nested: {
            y: 2
         }
      };
      const observerProxyPair: IObserverProxyPair = plainObjectObserverProxyPairFactory.create(
         disposableOwner,
         { target: plainObject, mustProxify: truePredicate }
      );
      observer = observerProxyPair.observer;
      disposableOwner.canDispose.mockReturnValue(true);

      const objectPropertyObserverProxyPairManager =
         InjectionContainer.get<IObjectPropertyObserverProxyPairManager>(
            RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
         );
      const propertyObserverProxyPairManager =
         objectPropertyObserverProxyPairManager.getFromId(plainObject);
      const nestedPropertyObserverProxyPairManager =
         objectPropertyObserverProxyPairManager.getFromId(plainObject.nested);
      const xId = propertyObserverProxyPairManager.getId({
         key: 'x',
         mustProxify: truePredicate,
      });
      const nestedId = propertyObserverProxyPairManager.getId({
         key: 'nested',
         mustProxify: truePredicate,
      });
      const yId = nestedPropertyObserverProxyPairManager.getId({
         key: 'y',
         mustProxify: truePredicate,
      });

      expect(propertyObserverProxyPairManager.getFromId(xId)).toBeDefined();
      expect(propertyObserverProxyPairManager.getFromId(nestedId)).toBeDefined();
      expect(nestedPropertyObserverProxyPairManager.getFromId(yId)).toBeDefined();
      expect(plainObject).isWritableProperty('x');
      expect(plainObject).isWritableProperty('nested');
      expect(plainObject.nested).isWritableProperty('y')

      observer.dispose();

      expect(propertyObserverProxyPairManager.getFromId(xId)).toBeUndefined();
      expect(propertyObserverProxyPairManager.getFromId(nestedId)).toBeUndefined();
      expect(nestedPropertyObserverProxyPairManager.getFromId(yId)).toBeUndefined();
      expect(plainObject).not.isWritableProperty('x');
      expect(plainObject).not.isWritableProperty('nested');
      expect(plainObject.nested).not.isWritableProperty('y')
   });

   it('will only patch root field when no mustProxify handler is passed in', () => {
      const plainObject = {
         a: 1,
         b: 2,
         nested: {
            c: 3,
            d: 4
         }
      };

      const observerProxyPair: IObserverProxyPair = plainObjectObserverProxyPairFactory.create(
         disposableOwner,
         { target: plainObject }
      );
      observer = observerProxyPair.observer;

      expect(plainObject).isWritableProperty('a');
      expect(plainObject).isWritableProperty('b');
      expect(plainObject).isWritableProperty('nested');
      expect(plainObject.nested).not.isWritableProperty('c');
      expect(plainObject.nested).not.isWritableProperty('d');

   });

   it('will only patch fields for which mustProxify returns true', () => {
      const plainObject = {
         a: 1,
         b: 2,
         nested: {
            c: 3,
            d: 4
         }
      };

      const mustProxify = jest.fn();
      mustProxify.mockImplementation((index: string) => index === 'a' || index === 'c' || index === 'nested');

      const observerProxyPair: IObserverProxyPair = plainObjectObserverProxyPairFactory.create(
         disposableOwner,
         { target: plainObject, mustProxify }
      );
      observer = observerProxyPair.observer;

      expect(mustProxify).toHaveBeenCalledTimes(5);
      expect(mustProxify).toHaveBeenNthCalledWith(1, 'a', plainObject);
      expect(mustProxify).toHaveBeenNthCalledWith(2, 'b', plainObject);
      expect(mustProxify).toHaveBeenNthCalledWith(3, 'nested', plainObject);
      expect(mustProxify).toHaveBeenNthCalledWith(4, 'c', plainObject.nested);
      expect(mustProxify).toHaveBeenNthCalledWith(5, 'd', plainObject.nested);

      expect(plainObject).isWritableProperty('a');
      expect(plainObject).not.isWritableProperty('b');
      expect(plainObject).isWritableProperty('nested');
      expect(plainObject.nested).isWritableProperty('c');
      expect(plainObject.nested).not.isWritableProperty('d');
   });

   describe(`change event for non recursive observer for '{ x: 1, nested: { y:2 } }`, () => {
      it(`change event is emitted when setting x = 100 in '{ x: 1, nested: { y:2 } }'`, async () => {
         const plainObject = {
            x: 1,
            nested: {
               y: 2
            }
         };
         observer = plainObjectObserverProxyPairFactory.create(disposableOwner, {
            target: plainObject,
            mustProxify: truePredicate
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            plainObject.x = 100
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: plainObject, id: 'x' }],
            id: 'x',
            newValue: 100,
            target: plainObject
         };

         expect(actual).toEqual(expected);
      });

      it(`change event is emitted when setting nested = {y : 200} in '{ x: 1, nested: { y:2 } }'`, async () => {
         const plainObject = {
            x: 1,
            nested: {
               y: 2
            }
         };
         observer = plainObjectObserverProxyPairFactory.create(disposableOwner, {
            target: plainObject,
            mustProxify: truePredicate
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            plainObject.nested = { y: 200 };
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: plainObject, id: 'nested' }],
            id: 'nested',
            newValue: { y: 200 },
            target: plainObject
         };

         expect(actual).toEqual(expected);
      });

      it(`change event is emitted when setting y = 300 in '{ x: 1, nested: { y:2 } }'`, async () => {
         const plainObject = {
            x: 1,
            nested: {
               y: 2
            }
         };
         observer = plainObjectObserverProxyPairFactory.create(disposableOwner, {
            target: plainObject,
            mustProxify: truePredicate
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            plainObject.nested.y = 300;
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [
               { object: plainObject, id: 'nested' },
               { object: plainObject.nested, id: 'y' }
            ],
            id: 'y',
            newValue: 300,
            target: plainObject.nested
         };

         expect(actual).toEqual(expected);
      });
   });

   describe(`change event for recursive observer for '{ x: 1, nested: { y:2 } }`, () => {
      it(`change event is emitted when setting x = 100 in '{ x: 1, nested: { y:2 } }'`, async () => {
         const plainObject = {
            x: 1,
            nested: {
               y: 2
            }
         };
         observer = plainObjectObserverProxyPairFactory.create(disposableOwner, {
            target: plainObject,
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            plainObject.x = 100
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: plainObject, id: 'x' }],
            id: 'x',
            newValue: 100,
            target: plainObject
         };

         expect(actual).toEqual(expected);
      });

      it(`change event is emitted when setting nested = {y : 200} in '{ x: 1, nested: { y:2 } }'`, async () => {
         const plainObject = {
            x: 1,
            nested: {
               y: 2
            }
         };
         observer = plainObjectObserverProxyPairFactory.create(disposableOwner, {
            target: plainObject,
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            plainObject.nested = { y: 200 };
         });

         const expected: IPropertyChange = {
            arguments: [],
            chain: [{ object: plainObject, id: 'nested' }],
            id: 'nested',
            newValue: { y: 200 },
            target: plainObject
         };

         expect(actual).toEqual(expected);
      });

      it(`non change event is emitted when setting y = 300 in '{ x: 1, nested: { y:2 } }'`, async () => {
         const plainObject = {
            x: 1,
            nested: {
               y: 2
            }
         };
         observer = plainObjectObserverProxyPairFactory.create(disposableOwner, {
            target: plainObject,
         }).observer;

         const actual = await new WaitForEvent(observer, 'changed').wait(() => {
            plainObject.nested.y = 300;
         });


         expect(actual).toBeNull();
      });
   });
});



