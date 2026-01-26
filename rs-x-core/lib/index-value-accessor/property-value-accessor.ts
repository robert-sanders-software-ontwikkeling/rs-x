import { isObservable } from 'rxjs';
import { Type } from '../types/type';
import { type IPropertyValueAccessor } from './property-value-accessor.type';

export class PropertyValueAccessor implements IPropertyValueAccessor {
   public readonly priority = 7;

   public isAsync(): boolean {
      return false;
   }

   public getIndexes(context: unknown): IterableIterator<string> {
      const obj = Type.toObject(context); 
      if(!obj) {
         return [].values();
      }
      return Object.keys(obj)
         .filter((key) => !Type.isMethod(obj[key] as object))
         .values();
   }

   public hasValue(context: unknown, index: string): boolean {
      const val = this.getValue(context, index);
      return val !== undefined;
   }

   public getResolvedValue(context: unknown, index: string): unknown {
      return this.getValue(context, index);
   }

   public getValue(context: unknown, index: string): unknown {
      const obj = Type.toObject(context);
      return obj ? obj[index] : undefined;
   }

   public setValue(context: unknown, index: string, value: unknown): void {
      const obj = Type.toObject(context);
      if(obj) {   
           obj[index] = value;
      }
    
   }

   public applies(context: unknown, index: string): boolean {
      const obj = Type.toObject(context);
      if(!obj) {
         return false;
      }
      return (
         Type.hasProperty(obj, index) &&
         !(obj instanceof Date) &&
         !isObservable(obj[index]) &&
         !(obj[index] instanceof Promise)
      );
   }
}