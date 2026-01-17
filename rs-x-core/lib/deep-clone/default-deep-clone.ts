import { Inject, Injectable, MultiInject } from '../dependency-injection';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';
import { IDeepCloneValueGetter } from './deep-clone-value-getter.interface';
import { IDeepClone } from './deep-clone.interface';

@Injectable()
export class DefaultDeepClone implements IDeepClone {
   public readonly priority = 0;

   constructor(
      @MultiInject(RsXCoreInjectionTokens.IDeepCloneList)
      private readonly _deepCloneList: readonly IDeepClone[],
      @Inject(RsXCoreInjectionTokens.IDeepCloneValueGetter)
      private readonly _deepCloneValueGetter: IDeepCloneValueGetter
   ) {
   }

   public clone(source: unknown): unknown {
      let error: Error;

      const value = this._deepCloneValueGetter.get(source);
      for (let i = 0; i < this._deepCloneList.length; i++) {
         try {
            return this._deepCloneList[i].clone(value);
         } catch (e) {
            error = e;
         }
      }
      throw error;
   }
}
