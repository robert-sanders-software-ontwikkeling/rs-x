import { isObservable } from 'rxjs';
import { Type } from '../types/type';
import { type IPropertyValueAccessor } from './property-value-accessor.type';

export class PropertyValueAccessor implements IPropertyValueAccessor {
   public readonly priority = 7;
   
   public isAsync(): boolean {
      return false;
   }

   public getIndexes(context: object): IterableIterator<string> {
      return Array.from(Object.keys(context).values()).filter(key => !Type.isMethod(context[key])).values();
   }

   public hasValue(context: object, index: string): boolean {
     return this.getValue(context, index) !== undefined;
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
         !(context instanceof Date)  &&
         !isObservable(context[index]) &&
         !(context[index] instanceof Promise)
      );
   }
}
