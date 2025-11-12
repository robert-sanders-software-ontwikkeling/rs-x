import { PropertyDescriptorType } from '../../lib/types/property-descriptor-type.enum';
import { IPropertyDescriptor } from '../../lib/types/property-descriptor.interface';
import { Type } from '../../lib/types/type';

describe('Type tests', () => {
   it('getPropertyDescriptor for overiden method', () => {
      const instance = new Derived();
      const actual = Type.getPropertyDescriptor(instance, 'method');

      const expected: IPropertyDescriptor = {
         type: PropertyDescriptorType.Function,
         descriptor: {
            configurable: true,
            writable: true,
            enumerable: false,
            value: Derived.prototype.method,
         },
      };
      expect(actual).toEqual(expected);
   });

   it('isPlainObject', () => {
      class Test { }
      expect(Type.isPlainObject({})).toEqual(true);
      expect(Type.isPlainObject(new Object())).toEqual(true);
      expect(Type.isPlainObject(Object.create(null))).toEqual(true);
      expect(Type.isPlainObject(Object.create({}))).toEqual(false);
      expect(Type.isPlainObject(new Test())).toEqual(false);
      expect(Type.isPlainObject(1)).toEqual(false);
      expect(Type.isPlainObject('test')).toEqual(false);
      expect(Type.isPlainObject(new Date())).toEqual(false);
      expect(Type.isPlainObject([])).toEqual(false);
      expect(Type.isPlainObject(new Function())).toEqual(false);
      expect(Type.isPlainObject(new Map())).toEqual(false);
      expect(Type.isPlainObject(new Set())).toEqual(false);
      expect(Type.isPlainObject(new RegExp(''))).toEqual(false);
      expect(Type.isPlainObject([])).toEqual(false);
      expect(Type.isPlainObject(jest.fn())).toEqual(false);
      expect(Type.isPlainObject(true)).toEqual(false);
      expect(Type.isPlainObject(null)).toEqual(false);
      expect(Type.isPlainObject(undefined)).toEqual(false);
   });



   it('isString', () => {
      expect(Type.isString('hi')).toEqual(true);
      expect(Type.isString(String('hi'))).toEqual(true);
      expect(Type.isString(null)).toEqual(false);
      expect(Type.isString(undefined)).toEqual(false);
      expect(Type.isString(1)).toEqual(false);
   });


   it('isFunction', () => {
      expect(Type.isFunction(() => 1)).toEqual(true);
      expect(
         Type.isFunction(function (): number {
            return 1;
         })
      ).toEqual(true);
      expect(Type.isFunction(new Function('return 1;'))).toEqual(true);
      expect(Type.isFunction(null)).toEqual(false);
      expect(Type.isFunction(undefined)).toEqual(false);
      expect(Type.isFunction(1)).toEqual(false);
   });



   it('isNullOrUndefined', () => {
      expect(Type.isNullOrUndefined(null)).toEqual(true);
      expect(Type.isNullOrUndefined(undefined)).toEqual(true);
      expect(Type.isNullOrUndefined(0)).toEqual(false);
      expect(Type.isNullOrUndefined('')).toEqual(false);
   });

   it('hasProperty returns true when base or derive class contains property', () => {
      const instance = new Derived();
      expect(Type.hasProperty(instance, 'baseProperty')).toEqual(true);
      expect(Type.hasProperty(instance, 'derivedProperty')).toEqual(true);
   });

   it('hasProperty returns true when base or derive class contains field', () => {
      const instance = new Derived();
      expect(Type.hasProperty(instance, 'baseField')).toEqual(true);
      expect(Type.hasProperty(instance, 'derivedField')).toEqual(true);
   });

   it('hasProperty returns false when base or derive class doen not contain property or field', () => {
      const instance = new Derived();
      expect(Type.hasProperty(instance, 'x')).toEqual(false);
   });

   it('getPropertyDescriptor for base field', () => {
      const instance = new Derived();
      const actual = Type.getPropertyDescriptor(instance, 'baseField');
      const expected: IPropertyDescriptor = {
         type: PropertyDescriptorType.Field,
         descriptor: {
            configurable: true,
            writable: true,
            enumerable: true,
            value: true,
         },
      };
      expect(actual).toEqual(expected);
   });

   it('getPropertyDescriptor for derived field', () => {
      const instance = new Derived();
      const actual = Type.getPropertyDescriptor(instance, 'derivedField');

      const expected: IPropertyDescriptor = {
         type: PropertyDescriptorType.Field,
         descriptor: {
            configurable: true,
            writable: true,
            enumerable: true,
            value: true,
         },
      };

      expect(actual).toEqual(expected);
   });

   it('getPropertyDescriptor for readonly property', () => {
      const instance = new Derived();
      const actual = Type.getPropertyDescriptor(
         instance,
         'baseReadonlyProperty'
      );
      const descriptor = Object.getOwnPropertyDescriptor(
         Base.prototype,
         'baseReadonlyProperty'
      );

      const expected: IPropertyDescriptor = {
         type: PropertyDescriptorType.ReadonlyProperty,
         descriptor: {
            configurable: true,
            enumerable: false,
            get: descriptor.get,
         },
      };
      expect(actual).toEqual(expected);
   });

   it('getPropertyDescriptor for derived property', () => {
      const instance = new Derived();
      const actual = Type.getPropertyDescriptor(instance, 'derivedProperty');
      const descriptor = Object.getOwnPropertyDescriptor(
         Derived.prototype,
         'derivedProperty'
      );

      const expected: IPropertyDescriptor = {
         type: PropertyDescriptorType.Property,
         descriptor: {
            configurable: true,
            enumerable: false,
            get: descriptor.get,
            set: descriptor.set,
         },
      };
      expect(actual).toEqual(expected);
   });

   it('getPropertyDescriptor for baseMethod', () => {
      const instance = new Derived();
      const actual = Type.getPropertyDescriptor(instance, 'baseMethod');
      const expected: IPropertyDescriptor = {
         type: PropertyDescriptorType.Function,
         descriptor: {
            configurable: true,
            writable: true,
            enumerable: false,
            value: Base.prototype.baseMethod,
         },
      };
      expect(actual).toEqual(expected);
   });

   it('getPropertyDescriptor for derivedMethod', () => {
      const instance = new Derived();
      const actual = Type.getPropertyDescriptor(instance, 'derivedMethod');
      const expected: IPropertyDescriptor = {
         type: PropertyDescriptorType.Function,
         descriptor: {
            configurable: true,
            writable: true,
            enumerable: false,
            value: Derived.prototype.derivedMethod,
         },
      };
      expect(actual).toEqual(expected);
   });

   it('getPropertyDescriptor for overiden method', () => {
      const instance = new Derived();
      const actual = Type.getPropertyDescriptor(instance, 'method');

      const expected: IPropertyDescriptor = {
         type: PropertyDescriptorType.Function,
         descriptor: {
            configurable: true,
            writable: true,
            enumerable: false,
            value: Derived.prototype.method,
         },
      };
      expect(actual).toEqual(expected);
   });
});

class Base {
   public baseField = true;
   private _baseProperty = 3;

   public get baseReadonlyProperty(): number {
      return 21;
   }

   public get baseProperty(): number {
      return this._baseProperty;
   }

   public set baseProperty(value: number) {
      this._baseProperty = value;
   }

   public method(): number {
      return 6;
   }

   public baseMethod(): number {
      return 10;
   }
}

class Derived extends Base {
   private _derivedProperty = 5;
   public derivedField = true;
   private readonly _factor = 6;

   public get derivedReadonlyProperty(): number {
      return 11;
   }

   public get derivedProperty(): number {
      return this._derivedProperty;
   }

   public set derivedProperty(value: number) {
      this._derivedProperty = value;
   }

   public override method(): number {
      return this._factor * super.method();
   }

   public derivedMethod(): number {
      return 110;
   }
}
