import { replaceSetItemAt } from '@rs-x/core';
import { Injectable } from '../dependency-injection';
import { ISetKeyAccessor } from './set-key-accessor.type';

@Injectable()
export class SetKeyAccessor implements ISetKeyAccessor {
   public isAsync(): boolean {
      return false;
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
