import { Injectable } from '../dependency-injection';
import { replaceSetItemAt } from '../types/set';
import { ISetKeyAccessor } from './set-key-accessor.type';

@Injectable()
export class SetKeyAccessor implements ISetKeyAccessor {
   public readonly priority = 3;

   public getIndexes(set: Set<unknown>): IterableIterator<unknown> {
     return new Set(set).values()
   }

   public isAsync(): boolean {
      return false;
   }

   public hasValue(set: Set<unknown>, key: unknown): boolean {
      return set.has(key);
   }

   public getResolvedValue(set: Set<unknown>, key: unknown): unknown {
      return set.has(key) ? key : undefined;
   }

   public getValue(set: Set<unknown>, key: unknown): unknown {
      return this.getResolvedValue(set, key);
   }

   public setValue(set: Set<unknown>, key: unknown, value: unknown): void {
      replaceSetItemAt(set, key, value);
   }

   public applies(map: unknown): boolean {
      return map instanceof Set;
   }
}
