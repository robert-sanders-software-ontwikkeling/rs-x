import { Injectable } from '../dependency-injection';
import { IArrayIndexAccessor } from './array-index-accessor.type';

@Injectable()
export class ArrayIndexAccessor implements IArrayIndexAccessor {
   public isAsync(): boolean {
      return false;
   }

   public getResolvedValue(array: unknown[], index: number): unknown {
      return array[index];
   }

   public getValue(array: unknown[], index: number): unknown {
      return this.getResolvedValue(array, index);
   }

   public setValue(array: unknown[], index: number, value: unknown): void {
      array[index] = value;
   }

   public applies(array: unknown): boolean {
      return Array.isArray(array);
   }
}
