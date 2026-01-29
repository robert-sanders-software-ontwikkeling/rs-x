import { Injectable, MultiInject } from '../dependency-injection';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';

import type { IDeepClone } from './deep-clone.interface';

@Injectable()
export class DefaultDeepClone implements IDeepClone {
   public readonly priority = 0;

   constructor(
      @MultiInject(RsXCoreInjectionTokens.IDeepCloneList)
      private readonly _deepCloneList: readonly IDeepClone[],

   ) {
   }

   public clone(source: unknown): unknown {
      let error: Error | null = null;

      for (let i = 0; i < this._deepCloneList.length; i++) {
         try {
            return this._deepCloneList[i].clone(source);
         } catch (e) {
            error = e as Error;
         }
      }
      throw error;
   }
}
