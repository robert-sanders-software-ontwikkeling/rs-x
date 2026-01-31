import { Injectable } from '../dependency-injection';

import type { IArrayIndexAccessor } from './array-index-accessor.type';

@Injectable()
export class ArrayIndexAccessor implements IArrayIndexAccessor {
  public readonly priority = 5;

  public getIndexes(array: unknown[]): IterableIterator<number> {
    return array.keys();
  }

  public hasValue(array: unknown[], index: number): boolean {
    return this.getValue(array, index) !== undefined;
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
