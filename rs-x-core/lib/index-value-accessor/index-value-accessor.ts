import { Inject, Injectable } from '../dependency-injection';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';
import { IIndexValueAccessor } from './index-value-accessor.interface';
import { IIndexValueAccessorProvider } from './index-value-accessor.provider.interface';

@Injectable()
export class IndexValueAccessor implements IIndexValueAccessor {
   constructor(
      @Inject(RsXCoreInjectionTokens.IIndexValueAccessorProvider)
      private readonly _indexValueAcessorProvider: IIndexValueAccessorProvider
   ) { }


   public getIndexes(context: unknown, index: unknown): IterableIterator<unknown> {
     return this._indexValueAcessorProvider
         .get(context, index)
         .getIndexes(context, index);
   }

   public isAsync(context: unknown, index: unknown): boolean {
      return this._indexValueAcessorProvider
         .get(context, index)
         .isAsync(context, index);
   }

   public hasValue(context: unknown, index: unknown): boolean {
      return this._indexValueAcessorProvider
         .get(context, index)
         .hasValue(context, index);
   }

   public getResolvedValue(context: unknown, index: unknown): unknown {
      return this._indexValueAcessorProvider
         .get(context, index)
         .getResolvedValue(context, index);
   }

   public getValue(context: unknown, index: unknown): unknown {
      return this._indexValueAcessorProvider
         .get(context, index)
         .getValue(context, index);
   }

   public setValue(context: unknown, index: unknown, value: unknown): void {
      this._indexValueAcessorProvider
         .get(context, index)
         .setValue(context, index, value);
   }

   public applies(context: unknown, index: unknown): boolean {
      return this._indexValueAcessorProvider
         .get(context, index)
         .applies(context, index);
   }
}
