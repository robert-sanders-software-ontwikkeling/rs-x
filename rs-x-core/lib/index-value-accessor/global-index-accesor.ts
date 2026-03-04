import { UnsupportedException } from '../exceptions/unsupported-exception';

import { type IGlobalIndexAccessor } from './global-index-accesor.type';

export class GlobalIndexAccessor implements IGlobalIndexAccessor {
  public readonly priority = -1;

  public getIndexes(_: unknown): IterableIterator<string> {
    return [].values();
  }

  public hasValue(_: unknown, index: string): boolean {
    return !!globalThis[index];
  }

  public getResolvedValue(context: unknown, index: string): unknown {
    return this.getValue(context, index);
  }

  public getValue(_: unknown, index: string): unknown {
    return globalThis[index];
  }

  public setValue(_: unknown, index: string): void {
    throw new UnsupportedException(`Cannot set  '${index}' on globalThis`);
  }

  public applies(context: unknown, index: string): boolean {
    return context === globalThis && index in context;
  }
}
