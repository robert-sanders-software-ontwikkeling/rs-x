import { Injectable, MultiInject } from '../dependency-injection';
import { UnsupportedException } from '../exceptions/unsupported-exception';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';
import { IIndexValueAccessor } from './index-value-accessor.interface';
import { IIndexValueAccessorProvider } from './index-value-accessor.provider.interface';

@Injectable()
export class IndexValueAccessorProvider implements IIndexValueAccessorProvider {
   
   constructor(
      @MultiInject(RsXCoreInjectionTokens.IIndexValueAccessorList)
      private readonly _accessors: readonly IIndexValueAccessor[]
   ) {
   }

   public get(
      context: unknown,
      index: unknown
   ): IIndexValueAccessor<unknown, unknown> {
      const accessor = this._accessors.find((accessor) =>
         accessor.applies(context, index)
      );

      if (!accessor) {
         throw new UnsupportedException(
            `No accessor found for ${context.constructor.name}.${index}`
         );
      }

      return accessor;
   }
}
