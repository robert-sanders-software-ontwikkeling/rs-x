import { UnsupportedException } from '../exceptions';
import { AnyFunction, Type } from '../types/type';
import { IMethodAccessor } from './method-accessor.type';

export class MethodAccessor implements IMethodAccessor {
   public isAsync(): boolean {
      return false;
   }

   public getResolvedValue(context: object, index: string): AnyFunction {
      return context[index];
   }

   public getValue(context: unknown, index: string): unknown {
      return context[index];
   }

   public setValue(_: object, index: string): void {
      throw new UnsupportedException(`Cannot set method '${index}'`);
   }

   public applies(context: unknown, index: string): boolean {
      return (
         Type.isFunction(context[index]) || Type.isArrowFunction(context[index])
      );
   }
}
