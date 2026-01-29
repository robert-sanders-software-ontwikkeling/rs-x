import { Inject, Injectable } from '../dependency-injection';
import { UnsupportedException } from '../exceptions';
import type { IDisposableFunctionCallIndex, IFunctionCallIndex } from '../function-call-index';
import type { IFunctionCallResultCacheFactory } from '../function-call-result-cache/function-call-result-cache.factory.interface';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';
import { Type } from '../types/type';

import type { IMethodAccessor } from './method-accessor.type';

@Injectable()
export class MethodAccessor implements IMethodAccessor {
   public readonly priority = 6;

   constructor(
      @Inject(RsXCoreInjectionTokens.IFunctionCallResultCacheFactory)
      private readonly _functionCallResultCacheFactory: IFunctionCallResultCacheFactory

   ) {
   }

   public getIndexes(): IterableIterator<IDisposableFunctionCallIndex> {
      return [].values();
   }

   public isAsync(): boolean {
      return false;
   }

   public hasValue(context: object, index: IFunctionCallIndex): boolean {
      return this._functionCallResultCacheFactory.has(context, index);
   }

   public getResolvedValue(context: object, index: IFunctionCallIndex): unknown {
      return this.getValue(context, index);
   }

   public getValue(context: unknown, index: IFunctionCallIndex): unknown {
      return this._functionCallResultCacheFactory.get(context, index)?.result;
   }

   public setValue(_: object, index: IFunctionCallIndex): void {
      throw new UnsupportedException(`Cannot set method '${index}'`);
   }

   public applies(context: unknown, index: IFunctionCallIndex): boolean {
      if (typeof context !== 'object' || context === null) {
         return false;
      }

      const prop = (context as Record<string, unknown>)[index.functionName];
      return Type.isFunction(prop) || Type.isArrowFunction(prop);
   }
}
