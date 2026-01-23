import cloneDeepWith from 'lodash.clonedeepwith';
import { isObservable } from 'rxjs';
import { Injectable } from '../dependency-injection';
import type { IDeepClone } from './deep-clone.interface';
@Injectable()
export class LodashDeepClone implements IDeepClone {
   public readonly priority = 1;

   public clone(source: unknown): unknown {
      return cloneDeepWith(source, this.cloneExceptPredicate);
   }

   private cloneExceptPredicate = (value: unknown): unknown => {
      if (value instanceof Promise || isObservable(value)) {
         return value;
      }

      return undefined;
   };
}
