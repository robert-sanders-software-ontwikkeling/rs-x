import { isObservable } from 'rxjs';
import { Type } from '../types/type';
import { IPropertyValueAccessor } from './property-value-accessor.type';

export class PropertyValueAccessor implements IPropertyValueAccessor {
   public isAsync(): boolean {
      return false;
   }

   public getResolvedValue(context: object, index: string): void {
      return context[index];
   }

   public getValue(context: unknown, index: string): unknown {
      return context[index];
   }

   public setValue(context: object, index: string, value: unknown): void {
      context[index] = value;
   }

   public applies(context: unknown, index: string): boolean {
      return (
         Type.hasProperty(context, index) &&
         !isObservable(context[index]) &&
         !(context[index] instanceof Promise)
      );
   }
}
