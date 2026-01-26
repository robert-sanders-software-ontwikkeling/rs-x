import { Injectable, MultiInject } from '../dependency-injection';
import { UnsupportedException } from '../exceptions/unsupported-exception';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';
import type { IIndexValueAccessor } from './index-value-accessor.interface';

@Injectable()
export class IndexValueAccessor implements IIndexValueAccessor {
   public readonly priority = 0;
   private readonly _accessors: readonly IIndexValueAccessor[]

   constructor(
      @MultiInject(RsXCoreInjectionTokens.IIndexValueAccessorList)
      accessors: readonly IIndexValueAccessor[]
   ) {
      this._accessors = [...accessors].sort((a, b) => b.priority - a.priority)
   }

   public getIndexes(context: unknown, index: unknown): IterableIterator<unknown> {
      return this
         .getIndexAccessor(context, index)
         .getIndexes(context, index);
   }

   public isAsync(context: unknown, index: unknown): boolean {
      return this
         .getIndexAccessor(context, index)
         .isAsync(context, index);
   }

   public hasValue(context: unknown, index: unknown): boolean {
      return this
         .getIndexAccessor(context, index)
         .hasValue(context, index);
   }

   public getResolvedValue(context: unknown, index: unknown): unknown {
      return this
         .getIndexAccessor(context, index)
         .getResolvedValue(context, index);
   }

   public getValue(context: unknown, index: unknown): unknown {
      return this
         .getIndexAccessor(context, index)
         .getValue(context, index);
   }

   public setValue(context: unknown, index: unknown, value: unknown): void {
      this
         .getIndexAccessor(context, index)
         .setValue(context, index, value);
   }

   public applies(context: unknown, index: unknown): boolean {
      return this
         .getIndexAccessor(context, index)
         .applies(context, index);
   }

   private getIndexAccessor(
      context: unknown,
      index: unknown
   ): IIndexValueAccessor<unknown, unknown> {
      const accessor = this._accessors.find((accessor) =>
         accessor.applies(context, index)
      );

      if (!accessor) {
         if (typeof context === 'object' && context !== null) {
            throw new UnsupportedException(
               `No accessor found for ${context.constructor.name}.${String(index)}`
            );
         } else {
            throw new UnsupportedException(
               `No accessor found for non-object context: ${String(context)}.${String(index)}`
            );
         }
      }

      return accessor;
   }
}
