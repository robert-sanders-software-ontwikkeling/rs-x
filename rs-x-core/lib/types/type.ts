import { ArgumentException } from '../exceptions/argument-exception';
import { PropertyDescriptorType } from './property-descriptor-type.enum';
import { IPropertyDescriptor } from './property-descriptor.interface';


export type CheckValidKey<T, U extends keyof T> = U;
export type GetFunction<T> = () => T;
export type SetFunction<T> = (value: T) => void;

export const emptyValue = Symbol('empty');
export type AnyFunction = (...args: unknown[]) => unknown;
export const emptyFunction = () => { };
export const truePredicate = () => true;
export const echo = (value) => value;

export class Type {
   public static isPositiveIntegerString(value: unknown): boolean {
      if (typeof value !== 'string' || value.length === 0) {
         return false;
      }

      if (value === '0') {
         return true;
      }

      if (value[0] === '0') {
         return false;
      }

      for (let i = 0; i < value.length; i++) {
         const code = value.charCodeAt(i);
         if (code < 48 || code > 57) {
            return false;
         }
      }

      return true;
   }

   public static isPositiveInteger(value: unknown): boolean {
      return (
         (typeof value === 'number' && Number.isInteger(value) && value >= 0) ||
         Type.isPositiveIntegerString(value)
      );
   }






   public static walkObjectTopToBottom(
      object: object,
      visit: (parent: object, key: string, value: unknown) => void,
      recursive: boolean
   ): void {
      if (typeof object !== 'object' || object === null) {
         return;
      }

      for (const [key, value] of Object.entries(object)) {
         visit(object, key, value);
         if (recursive && typeof value === 'object' && value !== null) {
            Type.walkObjectTopToBottom(value, visit, recursive);
         }
      }
   }

   public static walkObjectBottomToTop(
      object: object,
      visit: (parent: object, key: string, value: unknown) => void,
      recursive: boolean
   ): void {
      if (typeof object !== 'object' || object === null) {
         return;
      }

      for (const [key, value] of Object.entries(object)) {
         if (recursive && typeof value === 'object' && value !== null) {
            Type.walkObjectBottomToTop(value, visit, recursive);
         }
         visit(object, key, value);
      }
   }


   public static cast<T>(instance: unknown): T {
      return instance as T;
   }


   public static isFunction(value: unknown): value is AnyFunction {
      return typeof value === 'function';
   }

   public static isArrowFunction(
      object: unknown
   ): object is (...args: unknown[]) => unknown {
      return (
         Type.isFunction(object) &&
         !Object.prototype.hasOwnProperty.call(object, 'prototype')
      );
   }

   public static isString(value: unknown): value is string {
      return typeof value === 'string' || value instanceof String;
   }

   public static isNullOrUndefined(value: unknown): boolean {
      return value === null || value === undefined;
   }

   public static isEmpty(value: unknown): boolean {
      return (
         Type.isNullOrUndefined(value) ||
         (Type.isString(value) && value.length === 0) ||
         (Array.isArray(value) && value.length === 0)
      );
   }

   public static isPlainObject(object: unknown): boolean {
      if (object !== null && typeof object === 'object') {
         const prototype = Object.getPrototypeOf(object);
         return prototype === Object.prototype || prototype === null;
      }
      return false;
   }

   public static hasProperty(root: unknown, name: string): boolean {
      for (
         let current = root;
         current && current !== Object.prototype;
         current = Object.getPrototypeOf(current)
      ) {
         if (Object.prototype.hasOwnProperty.call(current, name)) {
            return true;
         }
      }
      return false;
   }

   public static hasOwnPropertyInPrototypeChain(
      target: unknown,
      key: PropertyKey
   ): boolean {
      if (target == null) {
         return false;
      }

      // Walk through prototype chain, including function prototypes
      let proto =
         typeof target === 'function'
            ? target.prototype
            : Object.getPrototypeOf(target);

      while (proto) {
         if (Object.prototype.hasOwnProperty.call(proto, key)) {
            return true;
         }
         proto = Object.getPrototypeOf(proto);
      }

      return false;
   }
   public static getPropertyDescriptorType(
      target: unknown,
      name: string,
      propertyDescriptor: PropertyDescriptor
   ): PropertyDescriptorType {
      if (propertyDescriptor.set) {
         return PropertyDescriptorType.Property;
      }

      if (propertyDescriptor.get) {
         return PropertyDescriptorType.ReadonlyProperty;
      }

      if (
         Type.isFunction(propertyDescriptor.value) &&
         Type.hasOwnPropertyInPrototypeChain(target, name)
      ) {
         return PropertyDescriptorType.Function;
      }

      return PropertyDescriptorType.Field;
   }

   public static getPropertyDescriptor<T>(
      root: unknown,
      name: keyof T
   ): IPropertyDescriptor {
      for (
         let current = root;
         current && current !== Object.prototype;
         current = Object.getPrototypeOf(current)
      ) {
         const propertyDescriptor = Object.getOwnPropertyDescriptor(
            current,
            name
         );
         if (propertyDescriptor) {
            return {
               type: Type.getPropertyDescriptorType(
                  root,
                  name as string,
                  propertyDescriptor
               ),
               descriptor: propertyDescriptor,
            };
         }
      }

      throw new ArgumentException(
         `${root.constructor.name} does not have a property, method or field with name '${String(name)}'`
      );
   }

}
