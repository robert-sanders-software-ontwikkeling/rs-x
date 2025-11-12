import { AnyFunction, Type } from '../types/type';
import { InvalidCastException } from './invalid-cast-exception';
import { NullOrEmptyException } from './null-or-empty-exception';
import { NullOrUndefinedException } from './null-or-undefined-exception';

export class Assertion {
   private constructor() {}

   public static assertIsFunction(
      value: unknown,
      name: string | number
   ): asserts value is AnyFunction {
      if (!Type.isFunction(value)) {
         throw new InvalidCastException(
            `${value.constructor.name}[${name}] is not a function`
         );
      }
   }

   public static assertNotNullOrUndefined(
      value: unknown,
      argumentName: string
   ): void {
      if (Type.isNullOrUndefined(value)) {
         throw new NullOrUndefinedException(argumentName);
      }
   }

   public static assertNotNullOrEmpty(
      value: unknown,
      argumentName: string
   ): void {
      if (Type.isEmpty(value)) {
         throw new NullOrEmptyException(argumentName);
      }
   }
}
