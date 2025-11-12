import cloneDeepWith from 'lodash.clonedeepwith';
import { isObservable } from 'rxjs';
import { Injectable } from '../dependency-injection';
import { IDeepClone } from './deep-clone.interface';

@Injectable()
export class DeepClone implements IDeepClone {
   public clone(source: unknown): unknown {
      try {
         return structuredClone(source);
      } catch {
         return cloneDeepWith(source, this.cloneExceptPredicate);
      }
   }

   private cloneExceptPredicate = (value: unknown): unknown => {
      if (value instanceof Promise || isObservable(value)) {
         return value;
      }

      return undefined;
   };
}
