import { InjectionContainer, IPropertyChange, WaitForEvent } from '@rs-x/core';
import { IObjectPropertyObserverManager } from '../../../../lib/property-observer/factories/non-iterable-object-property/object-property-observer-manager.type';
import { RsXStateManagerInjectionTokens } from '../../../../lib/rs-x-state-manager-injection-tokes';
import { RsXStateManagerModule } from '../../../../lib/rs-x-state-manager.module';
export class Base {
   private _property = 'property';
   public field = 'field';

   public get readonlyProperty(): string {
      return 'hello';
   }

   public get property(): string {
      return this._property;
   }

   public set property(value: string) {
      this._property = value;
   }

   public method(factor: number): number {
      return factor * 10;
   }

   public voidMethod(): void {
      return;
   }
}

export class Derived extends Base {
   public override get property(): string {
      return super.property;
   }

   public override set property(value: string) {
      super.property = value;
   }

   public override method(factor: number): number {
      return super.method(factor) * 2;
   }
}

describe('IObjectPropertyObserverManager: PropertObserver tests', () => {
   let objectPropertyObserverManager: IObjectPropertyObserverManager;
   let object: Derived;

   beforeAll(async () => {
      await InjectionContainer.load(RsXStateManagerModule);

      objectPropertyObserverManager = InjectionContainer.get(
         RsXStateManagerInjectionTokens.IObjectPropertyObserverManager
      );
   });

   afterAll(async () => {
      await InjectionContainer.unload(RsXStateManagerModule);
   });

   beforeEach(() => {
      object = new Derived();
   });

   afterEach(() => {
      objectPropertyObserverManager.dispose();
   });

   it('will throw an error when passed in property name does not refer to a field, property or function', () => {
      expect(() =>
         objectPropertyObserverManager
            .create(object)
            .instance.create({ index: 'x' })
      ).toThrow(
         `Derived does not have a property, method or field with name 'x'`
      );
   });

   it('will throw an exception for readonly property', () => {
      expect(() =>
         objectPropertyObserverManager
            .create(object)
            .instance.create({ index: 'readonlyProperty' })
      ).toThrow(
         `Property 'readonlyProperty' can not be watched because it is readonly`
      );
   });

   it('will emit change event when changing field value', async () => {
      const observer = objectPropertyObserverManager
         .create(object)
         .instance.create({ index: 'field' }).instance;

      const actual = (await new WaitForEvent(observer, 'changed').wait(() => {
         object.field = 'hi';
      })) as IPropertyChange;

      const expected: IPropertyChange = {
         arguments: [],
         target: object,
         chain: [{ object: object, id: 'field' }],
         id: 'field',
         newValue: 'hi',
         setValue: actual.setValue,
      };
      expect(actual).toEqual(expected);
   });

   it('will not emit change event when setting to the same field value', async () => {
      const observer = objectPropertyObserverManager
         .create(object)
         .instance.create({ index: 'field' }).instance;

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         object.field = 'field';
      });

      expect(actual).toBeNull();
   });

   it('will emit change event when changing property value', async () => {
      const observer = objectPropertyObserverManager
         .create(object)
         .instance.create({ index: 'property' }).instance;

      const actual = (await new WaitForEvent(observer, 'changed').wait(() => {
         object.property = 'hi';
      })) as IPropertyChange;

      const expected: IPropertyChange = {
         arguments: [],
         target: object,
         chain: [{ object: object, id: 'property' }],
         id: 'property',
         newValue: 'hi',
         setValue: actual.setValue,
      };
      expect(actual).toEqual(expected);
   });

   it('will not emit change event when setting to the same property value', async () => {
      const observer = objectPropertyObserverManager
         .create(object)
         .instance.create({ index: 'property' }).instance;

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         object.property = 'property';
      });

      expect(actual).toBeNull();
   });

   it('will emit change event when function return value has changed', async () => {
      const observer = objectPropertyObserverManager
         .create(object)
         .instance.create({ index: 'method' }).instance;
      object.method(5);

      const actual = (await new WaitForEvent(observer, 'changed').wait(() => {
         object.method(6);
      })) as IPropertyChange;

      const expected: IPropertyChange = {
         arguments: [6],
         target: object,
         chain: [{ object: object, id: 'method' }],
         id: 'method',
         newValue: 120,
         setValue: actual.setValue,
      };

      expect(actual).toEqual(expected);
   });

   it('will not emit change event when function return value has not changed', async () => {
      const observer = objectPropertyObserverManager
         .create(object)
         .instance.create({ index: 'method' }).instance;
      object.method(5);

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         object.method(5);
      });

      expect(actual).toBeNull();
   });

   it('dispose an will release the observer', async () => {
      const objectPropertyObserverrManager =
         objectPropertyObserverManager.create(object).instance;
      const propertyObserverrManager = objectPropertyObserverrManager.create({
         index: 'field',
      }).instance;

      propertyObserverrManager.dispose();

      expect(objectPropertyObserverManager.getFromId(object)).toBeUndefined();
      expect(objectPropertyObserverrManager.isEmpty).toEqual(true);
   });

   it('dispose an observed field will stop observing changes', async () => {
      const observer = objectPropertyObserverManager
         .create(object)
         .instance.create({ index: 'field' }).instance;
      observer.dispose();
      object.field = 'Hello Robert';

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         object.field = 'hi';
      });

      expect(actual).toBeNull();
   });

   it('dispose an observed property will stop observing changes', async () => {
      const observer = objectPropertyObserverManager
         .create(object)
         .instance.create({ index: 'property' }).instance;
      observer.dispose();

      object.property = 'Hi Robert';

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         object.property = 'hi';
      });

      expect(actual).toBeNull();
   });

   it('dispose an observed method will stop observing changes', async () => {
      const observer = objectPropertyObserverManager
         .create(object)
         .instance.create({ index: 'method' }).instance;
      object.method(7);
      observer.dispose();

      const actual = await new WaitForEvent(observer, 'changed').wait(() => {
         object.method(5);
      });

      expect(actual).toBeNull();
   });
});
